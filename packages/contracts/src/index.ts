export interface ApiEnvelope<T> {
  data: T;
  traceId: string;
}

export interface InventoryApplicationRequestedPayload {
  applicationId: string;
  materialId: string;
  applicantId: string;
  quantity: number;
}

export interface NotificationRequestedPayload {
  recipientId: string;
  channel: "in_app" | "email";
  title: string;
  body: string;
}
