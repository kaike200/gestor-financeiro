package com.gestor.financeiro;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Notificacoes")
public class NotificacoesPlugin extends Plugin {

    private boolean permissao() {
        String lista = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
        return lista != null && lista.contains(getContext().getPackageName());
    }

    @PluginMethod
    public void status(PluginCall call) {
        SharedPreferences sp = getContext().getSharedPreferences(NotificacaoService.PREFS, Context.MODE_PRIVATE);
        JSObject r = new JSObject();
        r.put("ativo", permissao());
        r.put("conectado", sp.getBoolean("conectado", false));
        r.put("vistas", sp.getInt("vistas", 0));
        r.put("capturadas", sp.getInt("capturadas", 0));
        call.resolve(r);
    }

    @PluginMethod
    public void abrirConfiguracoes(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
                getActivity().startActivity(i);
            } catch (Exception e) {
                try {
                    Intent i2 = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.parse("package:" + getContext().getPackageName()));
                    getActivity().startActivity(i2);
                } catch (Exception ignorado) { }
            }
        });
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
