# 🎯 PLAN DE ACCIÓN INMEDIATO

**Versión:** Ejecutiva  
**Prioridad:** CRÍTICA  
**Duración:** 1 semana  
**Responsable:** Team Lead

---

## ⏰ HOY - LUNES

### Tarea 1: Cambiar Credenciales SMTP (15 min) 🔴 CRÍTICO
**Responsable:** Cualquiera  
**Pasos:**
1. Ir a https://myaccount.google.com/apppasswords
2. Cambiar contraseña de aplicación
3. Copiar nueva contraseña
4. Actualizar `Backend/.env` local (NO COMMITAR)
5. Notificar al equipo

**Verificación:**
```bash
# Testear envío de email
curl -X POST http://localhost:3000/auth/password/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# Debe recibir email
```

---

### Tarea 2: Arreglar Validación ENV (1 hora) 🟠 ALTA
**Responsable:** Backend Developer  
**Pasos:**
1. Copiar código de `SOLUCIONES_PRACTICAS.md` - Solución 1
2. Crear `Backend/src/config/env.validation.ts`
3. Importar en `Backend/src/main.ts`
4. Ejecutar: `npm run build && npm test`
5. Commit: `fix: add environment validation`

**Verificación:**
```bash
cd Backend
unset JWT_SECRET  # Remover variable
npm run start     # Debe fallar con error claro
```

---

### Tarea 3: Implementar Rate Limiting (1.5 horas) 🟠 ALTA
**Responsable:** Backend Developer  
**Pasos:**
1. `npm install @nestjs/throttler`
2. Copiar código de `SOLUCIONES_PRACTICAS.md` - Solución 3
3. Crear configuración en `Backend/src/config/throttler.config.ts`
4. Agregar módulo a `app.module.ts`
5. Aplicar decoradores a auth endpoints
6. Test: `npm test`
7. Commit: `feat: add rate limiting`

**Verificación:**
```bash
# Intentar login 6 veces en 1 minuto
for i in {1..6}; do
  curl -X POST http://localhost:3000/auth/login \
    -d '{"email":"admin@rm.com","password":"wrong"}' \
    -H "Content-Type: application/json"
done
# Respuesta 6 debe ser 429 Too Many Requests
```

---

### Tarea 4: Cambiar JWT Secret (30 min) 🟠 ALTA
**Responsable:** Backend Developer  
**Pasos:**
1. Generar JWT_SECRET seguro:
   ```bash
   openssl rand -base64 48  # En Linux/Mac
   # O en Windows PowerShell:
   [Convert]::ToBase64String([byte[]](0..31 | ForEach {Get-Random -Maximum 256}))
   ```
2. Actualizar `Backend/.env` local (NO COMMITAR)
3. Actualizar `Backend/src/auth/auth.module.ts` según `SOLUCIONES_PRACTICAS.md` - Solución 2
4. Test: `npm run build`
5. Commit: `security: improve JWT secret validation`

---

## 📅 MARTES - MIÉRCOLES

### Tarea 5: Validar Webhook Wompi (2 horas) 🔴 CRÍTICO
**Responsable:** Backend Developer + QA  
**Pasos:**
1. Copiar código de `SOLUCIONES_PRACTICAS.md` - Solución 5
2. Crear `Backend/src/payments/wompi.validator.ts`
3. Crear `Backend/src/payments/wompi.controller.ts` con endpoint webhook
4. Actualizar `payments.module.ts`
5. Testear con webhook de prueba Wompi
6. Commit: `security: add wompi webhook validation`

**Verificación:**
```bash
# Testear webhook con firma válida
PAYLOAD='{"data":{"transaction":{"id":"123","status":"APPROVED"}}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WOMPI_INTEGRITY_SECRET" -hex | cut -d' ' -f2)

curl -X POST http://localhost:3000/payments/webhooks/wompi \
  -H "Content-Type: application/json" \
  -H "X-WOMPI-SIGNATURE: $SIGNATURE" \
  -d "$PAYLOAD"
# Debe responder 200
```

---

### Tarea 6: Code Splitting Frontend (1 hora) 🟠 ALTA
**Responsable:** Frontend Developer  
**Pasos:**
1. Actualizar `Frontend/vite.config.ts` según `SOLUCIONES_PRACTICAS.md` - Solución 4
2. Test: `npm run build`
3. Verificar tamaños de chunks:
   ```bash
   npm run build | grep "dist/"
   ```
4. Commit: `perf: implement code splitting`

**Resultado esperado:**
```
dist/react-vendor-XXXXX.js    ~300 KB
dist/chart-vendor-XXXXX.js    ~180 KB
dist/index-XXXXX.js           ~120 KB
Total: ~988 KB → ~700 KB (reducción 30%)
```

---

## 🗓️ JUEVES - VIERNES

### Tarea 7: Implementar CORS Mejorado (1 hora) 🟡 MODERADA
**Responsable:** Backend Developer  
**Pasos:**
1. Copiar código de `SOLUCIONES_PRACTICAS.md` - Solución 6
2. Actualizar `Backend/src/main.ts`
3. Crear `.env.production.example`
4. Test: `npm run start:dev`
5. Commit: `security: improve CORS configuration`

---

### Tarea 8: Health Checks Completos (1.5 horas) 🟡 MODERADA
**Responsable:** Backend Developer  
**Pasos:**
1. Copiar código de `SOLUCIONES_PRACTICAS.md` - Solución 7
2. Crear `Backend/src/health/`
3. Crear controlador y servicio
4. Agregar módulo a `app.module.ts`
5. Actualizar `docker-compose.yml` healthcheck
6. Test: `curl http://localhost:3000/health`
7. Commit: `feat: add health check endpoints`

---

### Tarea 9: Logging con Winston (2 horas) 🟡 MODERADA
**Responsable:** Backend Developer  
**Pasos:**
1. `npm install nest-winston winston winston-daily-rotate-file`
2. Copiar código de `SOLUCIONES_PRACTICAS.md` - Solución 8
3. Crear `Backend/src/config/logger.config.ts`
4. Importar en `Backend/src/main.ts`
5. Crear directorio `logs/`
6. Test: `npm run start:dev` (ver logs en archivos)
7. Commit: `feat: add structured logging with winston`

**Verificación:**
```bash
ls -la Backend/logs/
# Debe contener archivos de log
tail -f Backend/logs/application-2026-04-30.log
```

---

### Tarea 10: Testing Completo (2 horas) 🔵 BAJA
**Responsable:** QA  
**Pasos:**
1. Backend tests: `npm run test`
2. Frontend build: `npm run build`
3. E2E tests: `cd QA && npm run test`
4. Docker: `docker-compose up -d && npm run test:integration`
5. Manual testing: Flujo completo (login → operación → pago → reporte)

---

## 📊 RESUMEN DE TAREAS

### Por Día
- **Lunes:** 3.5 horas - Credenciales, ENV, Rate Limiting, JWT
- **Martes-Miércoles:** 3 horas - Wompi, Code Splitting
- **Jueves-Viernes:** 4.5 horas - CORS, Health, Logging
- **Total:** ~11 horas en 5 días

### Por Prioridad
- 🔴 **Críticas:** 3 tareas (4 horas)
- 🟠 **Altas:** 3 tareas (3.5 horas)
- 🟡 **Moderadas:** 2 tareas (3.5 horas)
- 🔵 **Bajas:** 2 tareas (2 horas)

---

## ✅ CHECKLIST DIARIO

### Lunes
- [ ] Email SMTP cambiado
- [ ] ENV validation implementado
- [ ] Rate limiting funciona
- [ ] JWT secret actualizado
- [ ] Todo compilado sin errores

### Martes-Miércoles
- [ ] Wompi webhook validando firmas
- [ ] Code splitting reduce bundle
- [ ] No hay advertencias en build

### Jueves
- [ ] CORS bien configurado
- [ ] Health checks respondiendo
- [ ] Logs en archivos

### Viernes
- [ ] Tests pasando
- [ ] E2E completadas
- [ ] Flujo manual validado
- [ ] Listo para staging

---

## 📞 REGLAS DE ORO

1. **NUNCA commitear `Backend/.env`**
   ```bash
   # Verificar antes de cada commit
   git status | grep -i "\.env"
   # No debe aparecer
   ```

2. **SIEMPRE testear después de cambios**
   ```bash
   npm run build && npm test
   ```

3. **SIEMPRE revisar en múltiples navegadores**
   - Chrome
   - Firefox
   - Safari/Edge

4. **NUNCA remover código, solo agregar**
   - Usar feature flags si es necesario
   - Backwards compatibility

5. **SIEMPRE comunicar cambios al equipo**
   - Slack notification
   - Daily standup

---

## 🚀 DESPUÉS DE COMPLETAR

1. **Crear Pull Request**
   ```bash
   git checkout -b sprint2-security-fixes
   # Hacer todos los cambios
   git push origin sprint2-security-fixes
   # Crear PR en GitHub
   ```

2. **Code Review**
   - [ ] 2 aprobaciones mínimo
   - [ ] CI/CD pasa
   - [ ] Tests verdes

3. **Merge a Main**
   ```bash
   # En GitHub, hacer merge
   git pull origin main
   ```

4. **Deploy a Staging**
   ```bash
   git checkout staging
   git merge main
   git push origin staging
   # Trigger deployment
   ```

5. **Validación en Staging**
   - [ ] Todos los endpoints funcionan
   - [ ] Tests E2E pasan
   - [ ] Performance mejorado
   - [ ] Logs correctos

---

## 📝 NOTAS IMPORTANTES

- Todos los cambios deben ser **reviewed** antes de merge
- Los **documentos generados** ya están listos en `c:\Sena\`
- Los **códigos** están en `SOLUCIONES_PRACTICAS.md`
- Las **explicaciones** están en `AUDIT_COMPLETO.md`
- El **resumen** está en `RESUMEN_EJECUTIVO.md`

---

## 📞 SOPORTE

- **¿No sé cómo hacer algo?** → Ver `SOLUCIONES_PRACTICAS.md`
- **¿Necesito entender un problema?** → Ver `AUDIT_COMPLETO.md`
- **¿Status general?** → Ver `RESUMEN_EJECUTIVO.md`
- **¿Tengo errores?** → Ver sección Troubleshooting

---

**Plan generado:** 30 de abril de 2026  
**Validez:** Inmediata  
**Actualizar:** Cuando cambien requisitos

**¡A TRABAJAR! 🚀**
