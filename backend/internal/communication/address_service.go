package communication

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/hopemart/backend/internal/shared/repository"
)

type AddressService struct {
	repo *repository.FirestoreRepo
}

func NewAddressService(repo *repository.FirestoreRepo) *AddressService {
	return &AddressService{repo: repo}
}

func (s *AddressService) userColl(uid string) *firestore.CollectionRef {
	return s.repo.Client.Collection("addresses").Doc(uid).Collection("saved")
}

func (s *AddressService) GetAll(ctx context.Context, uid string) ([]Address, error) {
	docs, err := s.repo.GetAll(ctx, s.userColl(uid).Query)
	if err != nil {
		return nil, fmt.Errorf("list addresses: %w", err)
	}
	addresses := make([]Address, 0, len(docs))
	for _, doc := range docs {
		var a Address
		if err := doc.DataTo(&a); err != nil {
			continue
		}
		a.ID = doc.Ref.ID
		addresses = append(addresses, a)
	}
	return addresses, nil
}

func (s *AddressService) Create(ctx context.Context, uid string, a Address) (*Address, error) {
	a.ID = uuid.New().String()
	a.UserID = uid
	a.CreatedAt = time.Now()

	if a.IsDefault {
		if err := s.clearDefault(ctx, uid); err != nil {
			return nil, err
		}
	}

	if _, err := s.userColl(uid).Doc(a.ID).Set(ctx, a); err != nil {
		return nil, fmt.Errorf("create address: %w", err)
	}
	return &a, nil
}

func (s *AddressService) Update(ctx context.Context, uid, id string, a Address) (*Address, error) {
	a.ID = id
	a.UserID = uid

	if a.IsDefault {
		if err := s.clearDefault(ctx, uid); err != nil {
			return nil, err
		}
	}

	if _, err := s.userColl(uid).Doc(id).Set(ctx, a, firestore.MergeAll); err != nil {
		return nil, fmt.Errorf("update address: %w", err)
	}
	return &a, nil
}

func (s *AddressService) Delete(ctx context.Context, uid, id string) error {
	if _, err := s.userColl(uid).Doc(id).Delete(ctx); err != nil {
		return fmt.Errorf("delete address: %w", err)
	}
	return nil
}

func (s *AddressService) SetDefault(ctx context.Context, uid, id string) error {
	if err := s.clearDefault(ctx, uid); err != nil {
		return err
	}
	if _, err := s.userColl(uid).Doc(id).Update(ctx, []firestore.Update{
		{Path: "isDefault", Value: true},
	}); err != nil {
		return fmt.Errorf("set default address: %w", err)
	}
	return nil
}

func (s *AddressService) clearDefault(ctx context.Context, uid string) error {
	docs, err := s.repo.GetAll(ctx, s.userColl(uid).Where("isDefault", "==", true))
	if err != nil {
		return fmt.Errorf("clear default: %w", err)
	}
	for _, doc := range docs {
		if _, err := doc.Ref.Update(ctx, []firestore.Update{{Path: "isDefault", Value: false}}); err != nil {
			return fmt.Errorf("clear default update: %w", err)
		}
	}
	return nil
}
