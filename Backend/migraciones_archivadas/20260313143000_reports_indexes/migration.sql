-- Índices de soporte para módulo de reportes.
CREATE INDEX "Ticket_entryTime_idx" ON "Ticket"("entryTime");
CREATE INDEX "Exit_exitTime_idx" ON "Exit"("exitTime");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Contract_userId_idx" ON "Contract"("userId");
CREATE INDEX "Contract_lastPaymentDate_idx" ON "Contract"("lastPaymentDate");
CREATE INDEX "Attendance_userId_idx" ON "Attendance"("userId");
CREATE INDEX "Attendance_checkIn_idx" ON "Attendance"("checkIn");
CREATE INDEX "Attendance_checkOut_idx" ON "Attendance"("checkOut");
