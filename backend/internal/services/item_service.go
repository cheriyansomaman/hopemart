package services

import (
	"context"
	"strings"

	"github.com/hopemart/backend/internal/models"
	"github.com/hopemart/backend/internal/repository"
)

type ItemService struct {
	repo *repository.FirestoreRepo
}

func NewItemService(repo *repository.FirestoreRepo) *ItemService {
	return &ItemService{repo: repo}
}

func (s *ItemService) List(ctx context.Context, page, limit int) ([]models.Item, error) {
	query := s.repo.Collection("items").OrderBy("createdAt", 0).Offset((page - 1) * limit).Limit(limit)
	docs, err := s.repo.GetAll(ctx, query)
	if err != nil {
		return nil, err
	}

	items := make([]models.Item, 0, len(docs))
	for _, doc := range docs {
		var item models.Item
		if err := doc.DataTo(&item); err != nil {
			continue
		}
		item.ID = doc.Ref.ID
		items = append(items, item)
	}
	return items, nil
}

func (s *ItemService) Search(ctx context.Context, q string) ([]models.Item, error) {
	q = strings.ToLower(q)
	end := q + ""

	query := s.repo.Collection("items").
		Where("name", ">=", q).
		Where("name", "<=", end).
		Limit(20)

	docs, err := s.repo.GetAll(ctx, query)
	if err != nil {
		return nil, err
	}

	items := make([]models.Item, 0, len(docs))
	for _, doc := range docs {
		var item models.Item
		if err := doc.DataTo(&item); err != nil {
			continue
		}
		item.ID = doc.Ref.ID
		items = append(items, item)
	}
	return items, nil
}

func (s *ItemService) GetByID(ctx context.Context, id string) (*models.Item, error) {
	doc, err := s.repo.Doc("items", id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var item models.Item
	if err := doc.DataTo(&item); err != nil {
		return nil, err
	}
	item.ID = doc.Ref.ID
	return &item, nil
}
