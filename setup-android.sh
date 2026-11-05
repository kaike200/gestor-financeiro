#!/bin/bash
# Cria o projeto Android e encaixa a leitura de notificações. Rode uma vez (o GitHub já faz isso).
set -e
npx cap add android
DIR=android/app/src/main/java/com/gestor/financeiro
mkdir -p "$DIR"
cp native/*.java "$DIR"/
python3 - <<'PY'
p = 'android/app/src/main/AndroidManifest.xml'
s = open(p, encoding='utf-8').read()
if 'NotificacaoService' not in s:
    svc = ('<service android:name=".NotificacaoService" android:exported="true" '
           'android:label="Gestor Financeiro" '
           'android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">'
           '<intent-filter><action android:name="android.service.notification.NotificationListenerService"/>'
           '</intent-filter></service>\n    ')
    s = s.replace('</application>', svc + '</application>')
    open(p, 'w', encoding='utf-8').write(s)
PY
echo "Pronto."
