package main

import (
	"context"
	"fmt"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"

	"github.com/joho/godotenv"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: setadmin <uid>\n")
		os.Exit(1)
	}
	uid := os.Args[1]

	_ = godotenv.Load()

	ctx := context.Background()
	var opts []option.ClientOption
	if creds := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"); creds != "" {
		opts = append(opts, option.WithCredentialsFile(creds))
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{
		ProjectID: os.Getenv("FIREBASE_PROJECT_ID"),
	}, opts...)
	if err != nil {
		log.Fatalf("firebase.NewApp: %v", err)
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		log.Fatalf("app.Auth: %v", err)
	}

	if err := authClient.SetCustomUserClaims(ctx, uid, map[string]interface{}{
		"admin": true,
	}); err != nil {
		log.Fatalf("SetCustomUserClaims: %v", err)
	}

	fmt.Printf("✓ admin:true set on uid %s\n", uid)
	fmt.Println("  User must sign out and sign back in for claim to take effect.")
}
