"""
BuildGuard Pro - AI Photo Analysis Service
Uses Claude Vision API for construction quality analysis
"""

import os
import base64
from typing import Dict, List, Any, Optional
import logging
import json

import httpx

from core.config import settings

logger = logging.getLogger(__name__)


class PhotoAnalyzer:
    """Service for analyzing construction photos using Claude Vision"""
    
    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY
        self.api_url = "https://api.anthropic.com/v1/messages"
        self.is_configured = bool(self.api_key)
    
    def is_ready(self) -> bool:
        """Check if the analyzer is configured and ready"""
        return self.is_configured
    
    async def analyze(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze a construction photo using Claude Vision
        
        Returns:
        - quality_score: 0-10 rating
        - issues_detected: List of detected issues
        - elements_detected: List of recognized elements
        - compliance_status: compliant/attention_needed/non_compliant
        - recommendations: List of recommendations
        """
        if not self.is_configured:
            logger.warning("Claude API key not configured, using fallback analysis")
            return self._fallback_analysis(image_path)
        
        try:
            # Read and encode image
            with open(image_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
            
            # Determine image format
            ext = image_path.lower().split('.')[-1]
            media_type = f"image/{'jpeg' if ext in ['jpg', 'jpeg'] else ext}"
            
            # Build Claude Vision prompt
            prompt = self._build_analysis_prompt()
            
            # Call Claude API
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.api_url,
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    json={
                        "model": "claude-3-sonnet-20240229",
                        "max_tokens": 1024,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "image",
                                        "source": {
                                            "type": "base64",
                                            "media_type": media_type,
                                            "data": image_data
                                        }
                                    },
                                    {
                                        "type": "text",
                                        "text": prompt
                                    }
                                ]
                            }
                        ]
                    }
                )
            
            if response.status_code != 200:
                logger.error(f"Claude API error: {response.status_code} - {response.text}")
                return self._fallback_analysis(image_path)
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            # Parse the response
            return self._parse_claude_response(content)
            
        except Exception as e:
            logger.error(f"Photo analysis failed: {e}")
            return self._fallback_analysis(image_path)
    
    def _build_analysis_prompt(self) -> str:
        """Build the analysis prompt for Claude"""
        return """Analyze this construction site photo and provide a detailed assessment in JSON format:

{
    "quality_score": <number 0-10>,
    "issues_detected": [<list of specific issues found>],
    "elements_detected": [<list of construction elements visible>],
    "compliance_status": "compliant|attention_needed|non_compliant",
    "recommendations": [<list of actionable recommendations>],
    "safety_concerns": [<any safety issues>],
    "workmanship_assessment": "excellent|good|fair|poor",
    "progress_estimate": <percentage if applicable>,
    "detailed_observations": "<detailed description of what you see>"
}

Look for:
1. Construction quality (concrete finish, rebar placement, formwork)
2. Safety issues (PPE, scaffolding, site conditions)
3. Code compliance (proper procedures, materials)
4. Workmanship (cleanliness, precision, professional standards)
5. Progress indicators (what stage of work is visible)
6. Potential defects (cracks, misalignment, poor materials)

Be thorough and specific in your observations."""
    
    def _parse_claude_response(self, content: str) -> Dict[str, Any]:
        """Parse Claude's response into structured data"""
        try:
            # Try to extract JSON from the response
            # Claude might wrap it in markdown code blocks
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                json_str = content.split("```")[1].split("```")[0].strip()
            else:
                json_str = content.strip()
            
            analysis = json.loads(json_str)
            
            # Ensure all expected fields exist
            return {
                "quality_score": analysis.get("quality_score", 5.0),
                "issues_detected": analysis.get("issues_detected", []),
                "elements_detected": analysis.get("elements_detected", []),
                "compliance_status": analysis.get("compliance_status", "attention_needed"),
                "recommendations": analysis.get("recommendations", []),
                "safety_concerns": analysis.get("safety_concerns", []),
                "workmanship_assessment": analysis.get("workmanship_assessment", "fair"),
                "progress_estimate": analysis.get("progress_estimate"),
                "detailed_observations": analysis.get("detailed_observations", ""),
                "ai_analyzed": True
            }
            
        except json.JSONDecodeError:
            logger.warning("Could not parse Claude response as JSON, using text analysis")
            return {
                "quality_score": 5.0,
                "issues_detected": [],
                "elements_detected": [],
                "compliance_status": "attention_needed",
                "recommendations": ["Please review the image manually"],
                "detailed_observations": content[:500],
                "ai_analyzed": True,
                "parse_error": True
            }
    
    def _fallback_analysis(self, image_path: str) -> Dict[str, Any]:
        """
        Fallback analysis when Claude API is not available
        Uses basic image properties and heuristics
        """
        try:
            from PIL import Image
            
            img = Image.open(image_path)
            width, height = img.size
            
            # Basic image quality assessment
            # Larger images generally have more detail
            resolution_score = min(10, (width * height) / (1000 * 1000) * 2)
            
            # Estimate brightness (well-lit photos are better)
            gray = img.convert('L')
            brightness = sum(gray.getdata()) / (width * height)
            brightness_score = 10 - abs(brightness - 128) / 12.8
            
            # Combined score
            quality_score = round((resolution_score + brightness_score) / 2, 1)
            
            return {
                "quality_score": quality_score,
                "issues_detected": [],
                "elements_detected": ["Unable to detect without AI analysis"],
                "compliance_status": "attention_needed",
                "recommendations": [
                    "Configure ANTHROPIC_API_KEY for AI-powered analysis",
                    "Manual review recommended until AI is configured"
                ],
                "detailed_observations": f"Image resolution: {width}x{height}. Basic quality score based on resolution and brightness.",
                "ai_analyzed": False,
                "image_properties": {
                    "width": width,
                    "height": height,
                    "brightness": round(brightness, 1)
                }
            }
            
        except Exception as e:
            logger.error(f"Fallback analysis failed: {e}")
            return {
                "quality_score": 0,
                "issues_detected": ["Analysis failed"],
                "elements_detected": [],
                "compliance_status": "non_compliant",
                "recommendations": ["Unable to analyze image"],
                "ai_analyzed": False,
                "error": str(e)
            }
    
    async def batch_analyze(self, image_paths: List[str]) -> List[Dict[str, Any]]:
        """Analyze multiple photos in batch"""
        results = []
        for path in image_paths:
            result = await self.analyze(path)
            results.append(result)
        return results
    
    async def compare_photos(self, photo1_path: str, photo2_path: str) -> Dict[str, Any]:
        """
        Compare two photos to detect changes/differences
        Useful for before/after comparisons
        """
        if not self.is_configured:
            return {"error": "Claude API not configured"}
        
        try:
            # Read both images
            with open(photo1_path, 'rb') as f:
                image1_data = base64.b64encode(f.read()).decode('utf-8')
            
            with open(photo2_path, 'rb') as f:
                image2_data = base64.b64encode(f.read()).decode('utf-8')
            
            ext = photo1_path.lower().split('.')[-1]
            media_type = f"image/{'jpeg' if ext in ['jpg', 'jpeg'] else ext}"
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.api_url,
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    json={
                        "model": "claude-3-sonnet-20240229",
                        "max_tokens": 1024,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "image",
                                        "source": {
                                            "type": "base64",
                                            "media_type": media_type,
                                            "data": image1_data
                                        }
                                    },
                                    {
                                        "type": "image",
                                        "source": {
                                            "type": "base64",
                                            "media_type": media_type,
                                            "data": image2_data
                                        }
                                    },
                                    {
                                        "type": "text",
                                        "text": "Compare these two construction photos. The first is 'before' and the second is 'after'. Describe what changes you see, what work was done, and assess the quality of the work. Return as JSON with fields: changes_detected, work_completed, quality_assessment, issues_found"
                                    }
                                ]
                            }
                        ]
                    }
                )
            
            if response.status_code != 200:
                return {"error": f"API error: {response.status_code}"}
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            return self._parse_claude_response(content)
            
        except Exception as e:
            logger.error(f"Photo comparison failed: {e}")
            return {"error": str(e)}
