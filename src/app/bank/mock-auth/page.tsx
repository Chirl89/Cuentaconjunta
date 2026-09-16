"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck, CheckCircle2, Lock, ArrowRight, Building2, AlertTriangle } from "lucide-react";

function MockAuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const requisitionId = searchParams.get("requisition_id") || "mock_req_demo";
  const bankName = searchParams.get("bank_name") || "Banco Santander";
  const redirectUrl = searchParams.get("redirect_url") || "/";

  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleAuthorize = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      // Build final redirect
      try {
        const url = new URL(redirectUrl, window.location.origin);
        url.searchParams.set("bank_auth_success", "true");
        url.searchParams.set("requisition_id", requisitionId);
        window.location.href = url.toString();
      } catch {
        window.location.href = `/?bank_auth_success=true&requisition_id=${requisitionId}`;
      }
    }, 900);
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header with Bank simulation */}
        <div className="bg-slate-900 text-white p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00D09C] flex items-center justify-center shadow-md">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-extrabold text-base tracking-tight">{bankName}</h2>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  Pasarela PSD2 Oficial
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Modo Sandbox
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Conexión cifrada de extremo a extremo</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00A37A]" />
              <span>Solicitud de Consentimiento Bancario</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              La aplicación <strong>Cuenta Conjunta</strong> solicita acceso de lectura a tus cuentas y tarjetas en <strong>{bankName}</strong>.
            </p>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Acceso de <strong>solo lectura</strong> a saldos y movimientos históricos (hasta 90 días).</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Consentimiento válido durante <strong>90 días</strong> (renovable conforme a normativa europea PSD2).</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Cero capacidad de emitir pagos o transferencias</strong> (acceso 100% protegido).</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Estás en el simulador Sandbox de Open Banking. Al pulsar el botón inferior se simulará una autorización exitosa y descubrirás las cuentas para asignar su titularidad.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleAuthorize}
              disabled={isAuthorizing}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#00D09C] hover:bg-[#00B386] active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-[#00D09C]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isAuthorizing ? (
                <span>Autorizando con {bankName}...</span>
              ) : (
                <>
                  <span>Autorizar Acceso Bancario</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={handleCancel}
              disabled={isAuthorizing}
              className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              Cancelar y Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MockAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="animate-pulse text-sm font-semibold">Cargando pasarela bancaria PSD2...</div>
        </div>
      }
    >
      <MockAuthContent />
    </Suspense>
  );
}
