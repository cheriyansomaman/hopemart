package party

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	sharedfb "github.com/hopemart/backend/internal/shared/firebase"
	"github.com/hopemart/backend/internal/shared/repository"
)

type Service struct {
	repo *repository.FirestoreRepo
	fb   *sharedfb.Client
}

func NewService(repo *repository.FirestoreRepo, fb *sharedfb.Client) *Service {
	return &Service{repo: repo, fb: fb}
}

func (s *Service) UpsertLogin(ctx context.Context, uid string) (*Party, error) {
	token, err := s.fb.Auth.GetUser(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("get firebase user: %w", err)
	}

	userDoc := s.fb.Firestore.Collection("users").Doc(uid)
	_, err = userDoc.Set(ctx, map[string]interface{}{
		"phone":       token.PhoneNumber,
		"lastLoginAt": time.Now(),
	}, firestore.MergeAll)
	if err != nil {
		return nil, fmt.Errorf("upsert user: %w", err)
	}

	snap, err := userDoc.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("get user doc: %w", err)
	}
	var p Party
	if err := snap.DataTo(&p); err != nil {
		return nil, fmt.Errorf("decode user: %w", err)
	}
	p.UID = uid
	return &p, nil
}

func (s *Service) UpdateProfile(ctx context.Context, uid, name, dateOfBirth string) error {
	dob, err := time.Parse("2006-01-02", dateOfBirth)
	if err != nil {
		return fmt.Errorf("dateOfBirth must be YYYY-MM-DD")
	}
	_, err = s.fb.Firestore.Collection("users").Doc(uid).Set(ctx, map[string]interface{}{
		"name":        name,
		"dateOfBirth": dob,
	}, firestore.MergeAll)
	if err != nil {
		return fmt.Errorf("update profile: %w", err)
	}
	return nil
}

func (s *Service) GetByID(ctx context.Context, uid string) (*Party, error) {
	snap, err := s.repo.Doc("users", uid).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("get party: %w", err)
	}
	var p Party
	if err := snap.DataTo(&p); err != nil {
		return nil, fmt.Errorf("decode party: %w", err)
	}
	p.UID = uid
	return &p, nil
}

func (s *Service) ListAll(ctx context.Context) ([]Party, error) {
	docs, err := s.repo.GetAll(ctx, s.repo.Collection("users").Query)
	if err != nil {
		return nil, fmt.Errorf("list parties: %w", err)
	}
	parties := make([]Party, 0, len(docs))
	for _, doc := range docs {
		var p Party
		if err := doc.DataTo(&p); err != nil {
			continue
		}
		p.UID = doc.Ref.ID
		parties = append(parties, p)
	}
	return parties, nil
}
