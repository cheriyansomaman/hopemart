package product

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/hopemart/backend/internal/shared/repository"
)

type Service struct {
	repo        *repository.FirestoreRepo
	uploadsDir  string
	uploadsBase string
}

func NewService(repo *repository.FirestoreRepo, uploadsDir, uploadsBase string) *Service {
	return &Service{repo: repo, uploadsDir: uploadsDir, uploadsBase: uploadsBase}
}

func (s *Service) List(ctx context.Context, page, limit int, category string) ([]Item, error) {
	base := s.repo.Collection("items").OrderBy("createdAt", 0)
	if category != "" {
		base = base.Where("category", "==", category)
	}
	query := base.Offset((page - 1) * limit).Limit(limit)
	docs, err := s.repo.GetAll(ctx, query)
	if err != nil {
		return nil, err
	}
	items := make([]Item, 0, len(docs))
	for _, doc := range docs {
		var item Item
		if err := doc.DataTo(&item); err != nil {
			continue
		}
		item.ID = doc.Ref.ID
		items = append(items, item)
	}
	return items, nil
}

func (s *Service) Search(ctx context.Context, q string) ([]Item, error) {
	q = strings.ToLower(q)
	query := s.repo.Collection("items").
		Where("name", ">=", q).
		Where("name", "<=", q+"").
		Limit(20)
	docs, err := s.repo.GetAll(ctx, query)
	if err != nil {
		return nil, err
	}
	items := make([]Item, 0, len(docs))
	for _, doc := range docs {
		var item Item
		if err := doc.DataTo(&item); err != nil {
			continue
		}
		item.ID = doc.Ref.ID
		items = append(items, item)
	}
	return items, nil
}

func (s *Service) GetByID(ctx context.Context, id string) (*Item, error) {
	doc, err := s.repo.Doc("items", id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var item Item
	if err := doc.DataTo(&item); err != nil {
		return nil, err
	}
	item.ID = doc.Ref.ID
	return &item, nil
}

func (s *Service) Create(ctx context.Context, item Item) (*Item, error) {
	item.ID = uuid.New().String()
	item.CreatedAt = time.Now()
	if _, err := s.repo.Doc("items", item.ID).Set(ctx, item); err != nil {
		return nil, fmt.Errorf("create item: %w", err)
	}
	return &item, nil
}

func (s *Service) Update(ctx context.Context, id string, fields map[string]any) error {
	if _, err := s.repo.Doc("items", id).Set(ctx, fields, firestore.MergeAll); err != nil {
		return fmt.Errorf("update item: %w", err)
	}
	return nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if _, err := s.repo.Doc("items", id).Delete(ctx); err != nil {
		return fmt.Errorf("delete item: %w", err)
	}
	return nil
}

// UploadImage saves an image to local disk and returns a public URL via the gateway.
func (s *Service) UploadImage(_ context.Context, filename string, data io.Reader, _ string) (string, error) {
	dir := filepath.Join(s.uploadsDir, "items")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("mkdir uploads: %w", err)
	}
	objectName := fmt.Sprintf("%d_%s", time.Now().UnixMilli(), filepath.Base(filename))
	dst := filepath.Join(dir, objectName)
	f, err := os.Create(dst)
	if err != nil {
		return "", fmt.Errorf("create file: %w", err)
	}
	defer f.Close()
	if _, err := io.Copy(f, data); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}
	return strings.TrimRight(s.uploadsBase, "/") + "/uploads/items/" + objectName, nil
}
