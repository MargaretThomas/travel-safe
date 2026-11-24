package main

import (
	"net/http"

	"github.com/syumai/workers-go"

	"github.com/mindsgn/travel-safe/api/internal/api"
)

func main() {
	http.Handle("/", api.New())
	workers.Serve(nil)
}
