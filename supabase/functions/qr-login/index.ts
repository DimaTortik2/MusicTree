import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Обработка CORS для браузера
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_token } = await req.json();
    if (!session_token) throw new Error("Missing session_token");

    // Клиент с правами сканирующего юзера (чтобы проверить кто он)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // Клиент с правами АДМИНА (только он может выдать magic link без почты)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Кто сканирует код?
    const { data: { user }, error: authError } = await supabaseClient.auth
      .getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // 2. Есть ли у него право на QR-вход?
    const { data: profile } = await supabaseAdmin.from("profiles")
      .select("can_use_qr_login")
      .eq("id", user.id)
      .single();

    if (!profile?.can_use_qr_login) {
      throw new Error("Нет доступа к этой функции");
    }

    // 3. Генерируем магическую ссылку авторизации (Письмо НЕ отправляется!)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin
      .generateLink({
        type: "magiclink",
        email: user.email!, // Email нужен функции, но письмо не летит
      });
    if (linkError) throw linkError;

    // 4. Обновляем сессию в БД
    const { error: updateError } = await supabaseAdmin.from("qr_auth_sessions")
      .update({
        status: "approved",
        user_id: user.id,
        action_link: linkData.properties.action_link, // Прячем ссылку в БД
      })
      .eq("id", session_token)
      .eq("status", "pending"); // Защита от двойного сканирования

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Безопасно достаем сообщение об ошибке
    const errorMessage = error instanceof Error
      ? error.message
      : "Неизвестная ошибка";

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
