package repository

import (
	"context"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

type FirestoreRepo struct {
	Client *firestore.Client
}

func New(client *firestore.Client) *FirestoreRepo {
	return &FirestoreRepo{Client: client}
}

func (r *FirestoreRepo) Collection(name string) *firestore.CollectionRef {
	return r.Client.Collection(name)
}

func (r *FirestoreRepo) Doc(collection, id string) *firestore.DocumentRef {
	return r.Client.Collection(collection).Doc(id)
}

func (r *FirestoreRepo) GetAll(ctx context.Context, query firestore.Query) ([]*firestore.DocumentSnapshot, error) {
	var docs []*firestore.DocumentSnapshot
	iter := query.Documents(ctx)
	defer iter.Stop()

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}
	return docs, nil
}
