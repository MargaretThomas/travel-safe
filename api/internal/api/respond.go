package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/mindsgn/travel-safe/api/internal/validate"
)

type errorBody struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Field   string `json:"field,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	if value != nil {
		_ = json.NewEncoder(w).Encode(value)
	}
}

func writeError(w http.ResponseWriter, status int, code, message, field string) {
	writeJSON(w, status, errorBody{Error: apiError{Code: code, Message: message, Field: field}})
}

func writeValidation(w http.ResponseWriter, err error) {
	if fieldErr, ok := validate.AsFieldError(err); ok {
		writeError(w, http.StatusUnprocessableEntity, "validation_failed", fieldErr.Message, fieldErr.Field)
		return
	}
	writeError(w, http.StatusBadRequest, "bad_request", err.Error(), "")
}

func writeUnexpected(w http.ResponseWriter, err error) {
	fmt.Printf("unexpected error: %v\n", err)
	writeError(w, http.StatusInternalServerError, "internal_error", "Something went wrong. Please try again.", "")
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(target); err != nil {
		if errors.Is(err, io.EOF) {
			return errors.New("A JSON body is required.")
		}
		return fmt.Errorf("invalid JSON: %w", err)
	}
	return nil
}
