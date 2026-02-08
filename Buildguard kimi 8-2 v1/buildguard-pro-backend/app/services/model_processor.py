"""
BuildGuard Pro - Model Processing Service
Handles 3D model file processing, conversion, and element extraction
"""

import os
import json
import subprocess
from pathlib import Path
from typing import Optional, Dict, List, Any
import logging

import numpy as np
from PIL import Image
import cv2

try:
    import ifcopenshell
    from ifcopenshell import geom
    IFC_AVAILABLE = True
except ImportError:
    IFC_AVAILABLE = False
    logging.warning("IfcOpenShell not available. IFC processing will be limited.")

logger = logging.getLogger(__name__)


class ModelProcessor:
    """Service for processing 3D model files"""
    
    def __init__(self):
        self.converted_dir = Path("/tmp/buildguard-uploads/converted")
        self.converted_dir.mkdir(parents=True, exist_ok=True)
    
    def is_ready(self) -> bool:
        """Check if the processor is ready"""
        return True  # Basic processing always available
    
    async def generate_glb(self, file_path: str, file_ext: str) -> Optional[str]:
        """
        Generate GLB file for web viewing
        
        For IFC files: Use IfcConvert or IfcOpenShell
        For OBJ/FBX: Use Blender or assimp
        For images: Generate placeholder
        """
        file_id = Path(file_path).stem
        output_path = self.converted_dir / f"{file_id}.glb"
        
        try:
            if file_ext in ['.ifc', '.ifczip']:
                return await self._ifc_to_glb(file_path, str(output_path))
            elif file_ext in ['.obj', '.fbx']:
                return await self._mesh_to_glb(file_path, str(output_path))
            elif file_ext in ['.dwg', '.dxf']:
                # DWG needs conversion to IFC first
                return None  # Placeholder - requires Teigha or similar
            else:
                # Generate a simple placeholder GLB
                return await self._generate_placeholder_glb(str(output_path))
        except Exception as e:
            logger.error(f"GLB generation failed: {e}")
            return None
    
    async def _ifc_to_glb(self, ifc_path: str, output_path: str) -> Optional[str]:
        """Convert IFC to GLB using IfcOpenShell"""
        if not IFC_AVAILABLE:
            logger.warning("IfcOpenShell not available, using placeholder")
            return await self._generate_placeholder_glb(output_path)
        
        try:
            # Load IFC file
            ifc_file = ifcopenshell.open(ifc_path)
            
            # Create geometry settings
            settings = geom.settings()
            settings.set(settings.USE_WORLD_COORDS, True)
            
            # Create iterator
            iterator = geom.iterator(settings, ifc_file, num_threads=4)
            
            if not iterator.initialize():
                logger.warning("No geometry found in IFC file")
                return await self._generate_placeholder_glb(output_path)
            
            # For now, create a simple GLTF structure
            # Full implementation would use a proper GLTF library
            gltf_data = self._create_simple_gltf(ifc_file)
            
            with open(output_path, 'w') as f:
                json.dump(gltf_data, f)
            
            return output_path
            
        except Exception as e:
            logger.error(f"IFC to GLB conversion failed: {e}")
            return await self._generate_placeholder_glb(output_path)
    
    async def _mesh_to_glb(self, mesh_path: str, output_path: str) -> Optional[str]:
        """Convert mesh file (OBJ/FBX) to GLB"""
        # This would use Blender Python API or assimp
        # For now, return placeholder
        return await self._generate_placeholder_glb(output_path)
    
    async def _generate_placeholder_glb(self, output_path: str) -> str:
        """Generate a simple placeholder GLB file"""
        # Create a minimal valid GLTF JSON
        gltf = {
            "asset": {"version": "2.0", "generator": "BuildGuard Pro"},
            "scene": 0,
            "scenes": [{"nodes": [0]}],
            "nodes": [{"mesh": 0}],
            "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}],
            "buffers": [{"uri": "data:application/octet-stream;base64,AAAA", "byteLength": 0}],
            "bufferViews": [],
            "accessors": []
        }
        
        with open(output_path, 'w') as f:
            json.dump(gltf, f)
        
        return output_path
    
    def _create_simple_gltf(self, ifc_file) -> dict:
        """Create a simple GLTF structure from IFC"""
        # Count elements by type
        element_counts = {}
        for element in ifc_file.by_type("IfcBuildingElement"):
            element_type = element.is_a()
            element_counts[element_type] = element_counts.get(element_type, 0) + 1
        
        return {
            "asset": {
                "version": "2.0",
                "generator": "BuildGuard Pro - IFC Processor",
                "extras": {
                    "ifc_elements": element_counts,
                    "total_elements": sum(element_counts.values())
                }
            },
            "scene": 0,
            "scenes": [{"name": "IFC Model", "nodes": []}],
            "nodes": [],
            "meshes": [],
            "materials": [],
            "buffers": [],
            "bufferViews": [],
            "accessors": []
        }
    
    async def extract_elements(self, file_path: str) -> Dict[str, Any]:
        """
        Extract building elements from IFC file
        
        Returns structured data about walls, columns, beams, etc.
        """
        if not IFC_AVAILABLE or not file_path.endswith('.ifc'):
            return {"error": "IFC processing not available", "elements": []}
        
        try:
            ifc_file = ifcopenshell.open(file_path)
            
            elements = {
                "walls": [],
                "columns": [],
                "beams": [],
                "slabs": [],
                "doors": [],
                "windows": [],
                "spaces": [],
                "other": []
            }
            
            # Extract walls
            for wall in ifc_file.by_type("IfcWall"):
                elements["walls"].append({
                    "id": wall.GlobalId,
                    "name": wall.Name if hasattr(wall, 'Name') else "Unnamed Wall",
                    "type": "wall"
                })
            
            # Extract columns
            for column in ifc_file.by_type("IfcColumn"):
                elements["columns"].append({
                    "id": column.GlobalId,
                    "name": column.Name if hasattr(column, 'Name') else "Unnamed Column",
                    "type": "column"
                })
            
            # Extract beams
            for beam in ifc_file.by_type("IfcBeam"):
                elements["beams"].append({
                    "id": beam.GlobalId,
                    "name": beam.Name if hasattr(beam, 'Name') else "Unnamed Beam",
                    "type": "beam"
                })
            
            # Extract slabs
            for slab in ifc_file.by_type("IfcSlab"):
                elements["slabs"].append({
                    "id": slab.GlobalId,
                    "name": slab.Name if hasattr(slab, 'Name') else "Unnamed Slab",
                    "type": "slab"
                })
            
            # Extract doors
            for door in ifc_file.by_type("IfcDoor"):
                elements["doors"].append({
                    "id": door.GlobalId,
                    "name": door.Name if hasattr(door, 'Name') else "Unnamed Door",
                    "type": "door"
                })
            
            # Extract windows
            for window in ifc_file.by_type("IfcWindow"):
                elements["windows"].append({
                    "id": window.GlobalId,
                    "name": window.Name if hasattr(window, 'Name') else "Unnamed Window",
                    "type": "window"
                })
            
            # Extract spaces/rooms
            for space in ifc_file.by_type("IfcSpace"):
                elements["spaces"].append({
                    "id": space.GlobalId,
                    "name": space.Name if hasattr(space, 'Name') else "Unnamed Space",
                    "type": "space"
                })
            
            return {
                "total_count": sum(len(v) for v in elements.values()),
                "by_type": {k: len(v) for k, v in elements.items()},
                "elements": elements
            }
            
        except Exception as e:
            logger.error(f"Element extraction failed: {e}")
            return {"error": str(e), "elements": []}
    
    async def generate_preview(self, file_path: str, file_ext: str) -> Optional[str]:
        """Generate preview image for the model"""
        file_id = Path(file_path).stem
        preview_path = self.converted_dir / f"{file_id}_preview.png"
        
        try:
            if file_ext in ['.png', '.jpg', '.jpeg']:
                # For images, just copy and resize
                img = Image.open(file_path)
                img.thumbnail((800, 600))
                img.save(preview_path)
                return str(preview_path)
            
            elif file_ext == '.pdf':
                # Would use pdf2image in production
                return None
            
            else:
                # Generate placeholder preview
                return await self._generate_placeholder_preview(str(preview_path))
                
        except Exception as e:
            logger.error(f"Preview generation failed: {e}")
            return None
    
    async def _generate_placeholder_preview(self, output_path: str) -> str:
        """Generate a placeholder preview image"""
        # Create a simple colored image
        img = Image.new('RGB', (800, 600), color=(240, 240, 240))
        img.save(output_path)
        return output_path
    
    async def analyze_floorplan(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze 2D floor plan image
        
        Uses computer vision to detect:
        - Walls
        - Rooms
        - Doors/windows
        - Dimensions
        """
        try:
            # Read image
            img = cv2.imread(file_path)
            if img is None:
                return {"error": "Could not read image file"}
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detect lines (walls)
            edges = cv2.Canny(gray, 50, 150)
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=50, maxLineGap=10)
            
            wall_count = len(lines) if lines is not None else 0
            
            # Detect contours (rooms)
            contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter for potential rooms (closed contours of reasonable size)
            room_contours = [c for c in contours if cv2.contourArea(c) > 1000]
            
            # Calculate image dimensions in pixels
            height, width = img.shape[:2]
            
            # Estimate scale (assuming A1 paper size or similar)
            # This is a simplified estimation
            estimated_scale = "1:100"  # Placeholder
            
            return {
                "image_dimensions": {"width": width, "height": height},
                "detected_walls": wall_count,
                "detected_rooms": len(room_contours),
                "estimated_scale": estimated_scale,
                "analysis_confidence": 0.75,
                "notes": [
                    "Wall detection based on line analysis",
                    "Room detection based on closed contour analysis",
                    "Scale estimation may require manual verification"
                ]
            }
            
        except Exception as e:
            logger.error(f"Floor plan analysis failed: {e}")
            return {"error": str(e)}
