package errors

import "net/http"

type DomainError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	Field      *string `json:"field"`
	StatusCode int    `json:"-"`
}

func (e *DomainError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return e.Code
}

func New(statusCode int, code string, message string, field *string) *DomainError {
	if message == "" {
		message = code
	}
	return &DomainError{
		Code:       code,
		Message:    message,
		Field:      field,
		StatusCode: statusCode,
	}
}

func AuthError(code string, message string, field *string) *DomainError {
	return New(http.StatusUnauthorized, code, message, field)
}

func NotFoundError(code string, message string, field *string) *DomainError {
	return New(http.StatusNotFound, code, message, field)
}

func ConflictError(code string, message string, field *string) *DomainError {
	return New(http.StatusConflict, code, message, field)
}

func ServiceUnavailableError(code string, message string, field *string) *DomainError {
	return New(http.StatusServiceUnavailable, code, message, field)
}

func ValidationFailed(code string, message string, field *string) *DomainError {
	return New(http.StatusUnprocessableEntity, code, message, field)
}

func BadRequestError(code string, message string, field *string) *DomainError {
	return New(http.StatusBadRequest, code, message, field)
}
