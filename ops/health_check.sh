#!/bin/bash

# Health Check Script para RM Parking
# Verifica que los contenedores clave estén corriendo y saludables

echo "Verificando estado de contenedores..."

# Definir servicios a revisar
SERVICES=("rmparking-db" "rmparking-backend" "rmparking-frontend")

ALL_OK=true

for SERVICE in "${SERVICES[@]}"; do
    if [ "$(docker ps -q -f name=$SERVICE)" ]; then
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' $SERVICE 2>/dev/null)
        if [ "$STATUS" == "healthy" ] || [ -z "$STATUS" ]; then
             # Nota: Algunos contenedores no tienen healthcheck definido, así que running es suficiente
            echo "✅ $SERVICE: Running"
        else
            echo "⚠️ $SERVICE: Running but status is $STATUS"
            ALL_OK=false
        fi
    else
        echo "❌ $SERVICE: Not running"
        ALL_OK=false
    fi
done

if [ "$ALL_OK" = true ]; then
    echo "¡Todos los servicios principales están operativos!"
    exit 0
else
    echo "Algunos servicios no están funcionando correctamente."
    exit 1
fi
