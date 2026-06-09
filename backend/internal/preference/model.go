package preference

import "time"

type CommunicationPreference struct {
	UserID                string    `json:"userId" firestore:"userId"`
	PreferredContact      string    `json:"preferredContact" firestore:"preferredContact"` // "email"|"phone"|"letter"
	NotificationFrequency string    `json:"notificationFrequency" firestore:"notificationFrequency"` // "immediate"|"daily"|"weekly"|"never"
	Email                 string    `json:"email,omitempty" firestore:"email,omitempty"`
	Phone                 string    `json:"phone,omitempty" firestore:"phone,omitempty"`
	PostalAddress         string    `json:"postalAddress,omitempty" firestore:"postalAddress,omitempty"`
	UpdatedAt             time.Time `json:"updatedAt" firestore:"updatedAt"`
}

type ProductInterestSignal struct {
	ItemID       string    `json:"itemId" firestore:"itemId"`
	ItemName     string    `json:"itemName" firestore:"itemName"`
	Category     string    `json:"category" firestore:"category"`
	SignalType    string    `json:"signalType" firestore:"signalType"` // "browse"|"purchase"
	Count        int       `json:"count" firestore:"count"`
	LastSignalAt time.Time `json:"lastSignalAt" firestore:"lastSignalAt"`
}
