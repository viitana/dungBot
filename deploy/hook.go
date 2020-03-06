package main

import (
	"fmt"
	"net/http"
	"gopkg.in/go-playground/webhooks.v5/github"
)

var path string = "/poobot_redeploy"

func main() {
	fmt.Printf("Github webhhook started\n")

	hook, _ := github.New(github.Options.Secret("yolo"))

	http.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
		payload, err := hook.Parse(r, github.PushEvent)
		if err != nil {
			if err == github.ErrEventNotFound {
				fmt.Printf("Received unwanted event")
				return // Not an event we want
			}
		}
		
		event := payload.(github.PushPayload)
		fmt.Printf("%+v", event)
	})
	http.ListenAndServe(":3000", nil)
}