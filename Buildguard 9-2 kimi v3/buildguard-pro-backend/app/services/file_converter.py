"""
BuildGuard Pro - File Conversion Service
Handles conversion between different 3D file formats
"""

import os
import subprocess
from pathlib import Path
from typing import Optional, Dict, List, Any
import logging
import shutil

logger = logging.getLogger(__name__)


class FileConverter:
    """Service for converting between 3D file formats"""
    
    def __init__(self):
        self.output_dir = Path("/tmp/buildguard-uploads/converted")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Check for available converters
        self.blender_available = self._check_blender()
        self.ifc_convert_available = self._check_ifc_convert()
        self.assimp_available = self._check_assimp()
    
    def is_ready(self) -> bool:
        """Check if any converters are available"""
        return True  # Can still do basic operations
    
    def _check_blender(self) -> bool:
        """Check if Blender is available"""
        try:
            result = subprocess.run(
                ["blender", "--version"],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except:
            return False
    
    def _check_ifc_convert(self) -> bool:
        """Check if IfcConvert is available"""
        try:
            result = subprocess.run(
                ["IfcConvert", "--version"],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except:
            return False
    
    def _check_assimp(self) -> bool:
        """Check if assimp is available"""
        try:
            result = subprocess.run(
                ["assimp", "version"],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except:
            return False
    
    async def convert(self, input_path: str, input_ext: str) -> Dict[str, Any]:
        """
        Convert a file to multiple output formats
        
        Returns dict of output formats and their paths
        """
        file_id = Path(input_path).stem
        results = {
            "input_format": input_ext,
            "output_formats": {},
            "errors": []
        }
        
        try:
            # Convert based on input format
            if input_ext in ['.ifc', '.ifczip']:
                results["output_formats"] = await self._convert_ifc(input_path, file_id)
            
            elif input_ext in ['.obj', '.fbx', '.3ds']:
                results["output_formats"] = await self._convert_mesh(input_path, file_id)
            
            elif input_ext in ['.dwg', '.dxf']:
                results["output_formats"] = await self._convert_cad(input_path, file_id)
            
            elif input_ext in ['.pdf', '.png', '.jpg', '.jpeg']:
                results["output_formats"] = await self._convert_image(input_path, file_id)
            
            else:
                results["errors"].append(f"Unsupported input format: {input_ext}")
            
        except Exception as e:
            logger.error(f"Conversion failed: {e}")
            results["errors"].append(str(e))
        
        return results
    
    async def _convert_ifc(self, input_path: str, file_id: str) -> Dict[str, str]:
        """Convert IFC to other formats"""
        outputs = {}
        
        # Convert to GLB using IfcConvert
        if self.ifc_convert_available:
            try:
                glb_path = self.output_dir / f"{file_id}.glb"
                result = subprocess.run(
                    [
                        "IfcConvert",
                        input_path,
                        str(glb_path),
                        "--use-world-coords",
                        "--convert-back-units"
                    ],
                    capture_output=True,
                    timeout=300
                )
                if result.returncode == 0 and glb_path.exists():
                    outputs["glb"] = str(glb_path)
            except Exception as e:
                logger.warning(f"IfcConvert failed: {e}")
        
        # Convert to OBJ using IfcConvert
        if self.ifc_convert_available:
            try:
                obj_path = self.output_dir / f"{file_id}.obj"
                result = subprocess.run(
                    [
                        "IfcConvert",
                        input_path,
                        str(obj_path),
                        "--use-world-coords"
                    ],
                    capture_output=True,
                    timeout=300
                )
                if result.returncode == 0 and obj_path.exists():
                    outputs["obj"] = str(obj_path)
            except Exception as e:
                logger.warning(f"IFC to OBJ conversion failed: {e}")
        
        # Convert to JSON (element data)
        try:
            import ifcopenshell
            ifc_file = ifcopenshell.open(input_path)
            
            json_data = {
                "project": ifc_file.by_type("IfcProject")[0].Name if ifc_file.by_type("IfcProject") else "Unknown",
                "elements": []
            }
            
            for element in ifc_file.by_type("IfcBuildingElement"):
                json_data["elements"].append({
                    "id": element.GlobalId,
                    "type": element.is_a(),
                    "name": getattr(element, 'Name', 'Unnamed')
                })
            
            json_path = self.output_dir / f"{file_id}.json"
            import json as json_lib
            with open(json_path, 'w') as f:
                json_lib.dump(json_data, f, indent=2)
            
            outputs["json"] = str(json_path)
            
        except Exception as e:
            logger.warning(f"IFC to JSON conversion failed: {e}")
        
        return outputs
    
    async def _convert_mesh(self, input_path: str, file_id: str) -> Dict[str, str]:
        """Convert mesh files (OBJ, FBX, etc.) to other formats"""
        outputs = {}
        
        # Use assimp if available
        if self.assimp_available:
            try:
                glb_path = self.output_dir / f"{file_id}.glb"
                result = subprocess.run(
                    [
                        "assimp",
                        "export",
                        input_path,
                        str(glb_path),
                        "glb2"
                    ],
                    capture_output=True,
                    timeout=120
                )
                if result.returncode == 0 and glb_path.exists():
                    outputs["glb"] = str(glb_path)
            except Exception as e:
                logger.warning(f"Assimp conversion failed: {e}")
        
        # Use Blender if available
        if self.blender_available and "glb" not in outputs:
            try:
                glb_path = self.output_dir / f"{file_id}.glb"
                
                # Blender Python script for conversion
                blender_script = f"""
import bpy
import sys

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Import file
bpy.ops.import_scene.obj(filepath="{input_path}")

# Export to GLB
bpy.ops.export_scene.gltf(
    filepath="{glb_path}",
    export_format='GLB'
)
"""
                result = subprocess.run(
                    [
                        "blender",
                        "--background",
                        "--python-expr", blender_script
                    ],
                    capture_output=True,
                    timeout=300
                )
                if result.returncode == 0 and glb_path.exists():
                    outputs["glb"] = str(glb_path)
            except Exception as e:
                logger.warning(f"Blender conversion failed: {e}")
        
        return outputs
    
    async def _convert_cad(self, input_path: str, file_id: str) -> Dict[str, str]:
        """Convert CAD files (DWG, DXF) to other formats"""
        outputs = {}
        
        # DWG/DXF conversion typically requires:
        # - Teigha File Converter (commercial)
        # - ODA File Converter (free)
        # - LibreCAD (DXF only)
        
        # For DXF, we can try LibreCAD
        if input_path.lower().endswith('.dxf'):
            try:
                # Check if LibreCAD is available
                result = subprocess.run(
                    ["librecad", "--version"],
                    capture_output=True,
                    timeout=5
                )
                # LibreCAD conversion would go here
            except:
                pass
        
        # For now, create a placeholder SVG preview
        try:
            svg_path = self.output_dir / f"{file_id}.svg"
            # Create a simple SVG placeholder
            svg_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f0f0"/>
  <text x="50%" y="50%" text-anchor="middle" font-size="24" fill="#666">
    CAD Preview: {Path(input_path).name}
  </text>
  <text x="50%" y="55%" text-anchor="middle" font-size="14" fill="#999">
    Full conversion requires Teigha or ODA converter
  </text>
</svg>"""
            with open(svg_path, 'w') as f:
                f.write(svg_content)
            outputs["svg"] = str(svg_path)
        except Exception as e:
            logger.warning(f"SVG creation failed: {e}")
        
        return outputs
    
    async def _convert_image(self, input_path: str, file_id: str) -> Dict[str, str]:
        """Convert images (floor plans) to other formats"""
        outputs = {}
        
        try:
            from PIL import Image
            
            img = Image.open(input_path)
            
            # Create optimized web version
            web_path = self.output_dir / f"{file_id}_web.jpg"
            img_copy = img.copy()
            img_copy.thumbnail((1920, 1080))
            img_copy.save(web_path, "JPEG", quality=85)
            outputs["web"] = str(web_path)
            
            # Create thumbnail
            thumb_path = self.output_dir / f"{file_id}_thumb.jpg"
            img_copy = img.copy()
            img_copy.thumbnail((400, 300))
            img_copy.save(thumb_path, "JPEG", quality=80)
            outputs["thumbnail"] = str(thumb_path)
            
        except Exception as e:
            logger.warning(f"Image conversion failed: {e}")
        
        return outputs
    
    async def get_conversion_info(self) -> Dict[str, Any]:
        """Get information about available converters"""
        return {
            "blender": {
                "available": self.blender_available,
                "description": "Blender for mesh conversion"
            },
            "ifc_convert": {
                "available": self.ifc_convert_available,
                "description": "IfcConvert for IFC files"
            },
            "assimp": {
                "available": self.assimp_available,
                "description": "Assimp for mesh formats"
            },
            "supported_formats": {
                "input": [".ifc", ".ifczip", ".obj", ".fbx", ".3ds", ".dwg", ".dxf", ".pdf", ".png", ".jpg", ".jpeg"],
                "output": [".glb", ".gltf", ".obj", ".json", ".svg"]
            }
        }
