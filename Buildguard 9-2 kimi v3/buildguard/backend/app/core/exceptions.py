"""Custom exception classes for BuildGuard domain errors."""


class BuildGuardError(Exception):
    """Base exception for BuildGuard domain errors."""
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class ProjectNotFoundError(BuildGuardError):
    def __init__(self, project_id: str):
        super().__init__(f"Project {project_id} not found", "PROJECT_NOT_FOUND")


class StageNotFoundError(BuildGuardError):
    def __init__(self, stage_id: str):
        super().__init__(f"Stage {stage_id} not found", "STAGE_NOT_FOUND")


class StageNotReadyError(BuildGuardError):
    def __init__(self, stage_id: str, reason: str):
        super().__init__(f"Stage {stage_id} not ready: {reason}", "STAGE_NOT_READY")


class PaymentBlockedError(BuildGuardError):
    def __init__(self, gate_id: str, reasons: list[str]):
        self.reasons = reasons
        super().__init__(f"Payment gate {gate_id} blocked: {', '.join(reasons)}", "PAYMENT_BLOCKED")


class PaymentGateNotFoundError(BuildGuardError):
    def __init__(self, gate_id: str):
        super().__init__(f"Payment gate {gate_id} not found", "PAYMENT_GATE_NOT_FOUND")


class UnauthorizedError(BuildGuardError):
    def __init__(self, message: str = "Not authorized"):
        super().__init__(message, "UNAUTHORIZED")


class DeviationNotFoundError(BuildGuardError):
    def __init__(self, deviation_id: str):
        super().__init__(f"Deviation {deviation_id} not found", "DEVIATION_NOT_FOUND")


class InvalidTransitionError(BuildGuardError):
    def __init__(self, from_status: str, to_status: str):
        super().__init__(f"Invalid status transition from {from_status} to {to_status}", "INVALID_TRANSITION")


class FileUploadError(BuildGuardError):
    def __init__(self, message: str = "File upload failed"):
        super().__init__(message, "FILE_UPLOAD_ERROR")
