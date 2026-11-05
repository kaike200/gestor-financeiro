package com.gestor.financeiro;

import android.content.Intent;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Notificacoes")
public class NotificacoesPlugin extends Plugin {
    private static NotificacoesPlugin instancia;

    @Override
    public void load() { instancia = this; }

    static void avisar() {
        if (instancia != null) instancia.notifyListeners("nova", new JSObject());
    }

    @PluginMethod
    public void temPermissao(PluginCall call) {
String lista = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
boolean ativo = lista != null && lista.contains(getContext().getPackageName());
        JSObject r = new JSObject();
        r.put("ativo", ativo);
        call.resolve(r);
    }

    @PluginMethod
    public void abrirConfiguracoes(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void lerFila(PluginCall call) {
        try {
            JSObject r = new JSObject();
            r.put("itens", new JSArray(NotificacaoService.retirarTudo(getContext())));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Erro ao ler a fila de notificações");
        }
    }
}
