"""
Domain exceptions for BuildGuard Pro.
Mapped to HTTP responses by global exception handlers in main.py.
"""


class ProjectNotFoundError(Exception):
    def __init__(self, project_id: str = ""):
        msg = f"Project not found: {project_id}" if project_id else "Project not found"
        super().__init__(msg)


class StageNotReadyError(Exception):
    def __init__(self, detail: str = "Stage is not ready for this operation"):
        super().__init__(detail)


class PaymentBlockedError(Exception):
    def __init__(self, detail: str = "Payment is blocked"):
        super().__init__(detail)


class UnauthorizedError(Exception):
    def __init__(self, detail: str = "Not authorized"):
        super().__init__(detail)
