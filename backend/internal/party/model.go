package party

import "time"

type Party struct {
	UID         string    `json:"uid" firestore:"uid"`
	Phone       string    `json:"phone" firestore:"phone"`
	Name        string    `json:"name,omitempty" firestore:"name,omitempty"`
	DateOfBirth time.Time `json:"dateOfBirth,omitempty" firestore:"dateOfBirth,omitempty"`
	LastLoginAt time.Time `json:"lastLoginAt" firestore:"lastLoginAt"`
}
