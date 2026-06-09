package firebase

import (
	"context"
	"log"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"cloud.google.com/go/firestore"
	"google.golang.org/api/option"
)

type Client struct {
	Auth      *auth.Client
	Firestore *firestore.Client
}

func NewClient(ctx context.Context, projectID, credentialsFile string) *Client {
	var opts []option.ClientOption
	if credentialsFile != "" {
		opts = append(opts, option.WithCredentialsFile(credentialsFile))
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, opts...)
	if err != nil {
		log.Fatalf("firebase.NewApp: %v", err)
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		log.Fatalf("app.Auth: %v", err)
	}

	fsClient, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalf("app.Firestore: %v", err)
	}

	return &Client{Auth: authClient, Firestore: fsClient}
}
