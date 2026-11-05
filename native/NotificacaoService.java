package com.gestor.financeiro;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import org.json.JSONArray;
import org.json.JSONObject;

// Fica ouvindo as notificações do celular. Guarda só as que têm "R$" (as outras são ignoradas)
// numa fila, para não perder nada mesmo com o app fechado.
public class NotificacaoService extends NotificationListenerService {
    static final String PREFS = "fila_notificacoes";
    static final String CHAVE = "itens";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            Notification n = sbn.getNotification();
            if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
            Bundle e = n.extras;
            String titulo = texto(e.getCharSequence(Notification.EXTRA_TITLE));
            String corpo = texto(e.getCharSequence(Notification.EXTRA_BIG_TEXT));
            if (corpo.isEmpty()) corpo = texto(e.getCharSequence(Notification.EXTRA_TEXT));
            if (!corpo.contains("R$")) return;

            JSONObject o = new JSONObject();
            o.put("pacote", sbn.getPackageName());
            o.put("titulo", titulo);
            o.put("texto", corpo);
            o.put("quando", sbn.getPostTime());
            o.put("chave", sbn.getKey());
            guardar(getApplicationContext(), o);
            NotificacoesPlugin.avisar();
        } catch (Exception ignorado) { }
    }

    private static String texto(CharSequence c) { return c == null ? "" : c.toString(); }

    static synchronized void guardar(Context ctx, JSONObject o) throws Exception {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray arr = new JSONArray(sp.getString(CHAVE, "[]"));
        arr.put(o);
        sp.edit().putString(CHAVE, arr.toString()).apply();
    }

    static synchronized String retirarTudo(Context ctx) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String s = sp.getString(CHAVE, "[]");
        sp.edit().remove(CHAVE).apply();
        return s;
    }
}
