package preference

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/hopemart/backend/internal/shared/repository"
)

type Service struct {
	repo *repository.FirestoreRepo
}

func NewService(repo *repository.FirestoreRepo) *Service {
	return &Service{repo: repo}
}

func (s *Service) Get(ctx context.Context, uid string) (*CommunicationPreference, error) {
	doc, err := s.repo.Doc("preferences", uid).Get(ctx)
	if err != nil {
		// Return default preference when none saved yet.
		return &CommunicationPreference{UserID: uid}, nil
	}
	var p CommunicationPreference
	if err := doc.DataTo(&p); err != nil {
		return nil, fmt.Errorf("decode preference: %w", err)
	}
	return &p, nil
}

func (s *Service) Set(ctx context.Context, uid string, p CommunicationPreference) (*CommunicationPreference, error) {
	p.UserID = uid
	p.UpdatedAt = time.Now()
	if _, err := s.repo.Doc("preferences", uid).Set(ctx, p); err != nil {
		return nil, fmt.Errorf("set preference: %w", err)
	}
	return &p, nil
}

func (s *Service) ListInterests(ctx context.Context, uid string) ([]ProductInterestSignal, error) {
	docs, err := s.repo.GetAll(ctx, s.repo.Client.Collection("product_interests").Doc(uid).Collection("signals").Query)
	if err != nil {
		return nil, fmt.Errorf("list interests: %w", err)
	}
	signals := make([]ProductInterestSignal, 0, len(docs))
	for _, doc := range docs {
		var sig ProductInterestSignal
		if err := doc.DataTo(&sig); err != nil {
			continue
		}
		signals = append(signals, sig)
	}
	return signals, nil
}

func (s *Service) RecordSignal(ctx context.Context, uid string, sig ProductInterestSignal) error {
	ref := s.repo.Client.Collection("product_interests").Doc(uid).Collection("signals").Doc(sig.ItemID)
	_, err := ref.Set(ctx, map[string]interface{}{
		"itemId":       sig.ItemID,
		"itemName":     sig.ItemName,
		"category":     sig.Category,
		"signalType":   sig.SignalType,
		"count":        firestore.Increment(1),
		"lastSignalAt": time.Now(),
	}, firestore.MergeAll)
	if err != nil {
		return fmt.Errorf("record signal: %w", err)
	}
	return nil
}

func (s *Service) RecordBatchSignals(ctx context.Context, uid string, signals []ProductInterestSignal) error {
	for _, sig := range signals {
		if err := s.RecordSignal(ctx, uid, sig); err != nil {
			return err
		}
	}
	return nil
}
