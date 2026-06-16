import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🔥 ДОБАВИЛИ return_link_only
    const { session_token, redirect_to, return_link_only } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Отсутствует заголовок Authorization");
    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: authError } = await supabaseClient.auth
      .getUser(token);
    if (authError || !user) throw new Error("Пользователь не найден");

    const { data: profile } = await supabaseAdmin.from("profiles").select(
      "can_use_qr_login",
    ).eq("id", user.id).single();
    if (!profile?.can_use_qr_login) {
      throw new Error("Нет доступа к этой функции");
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin
      .generateLink({
        type: "magiclink",
        email: user.email!,
        options: { redirectTo: redirect_to },
      });
    if (linkError) throw new Error(linkError.message);

    // 🔥 БЕЗОПАСНЫЙ РЕЖИМ: Просто возвращаем ссылку на ПК, в БД ничего не пишем!
    if (return_link_only) {
      return new Response(
        JSON.stringify({
          success: true,
          action_link: linkData.properties.action_link,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Старый режим для входа ПК через Телефон (уязвимый, если не отключить Realtime)
    if (!session_token) throw new Error("Не передан session_token");
    const { error: updateError } = await supabaseAdmin.from("qr_auth_sessions")
      .update({
        status: "approved",
        user_id: user.id,
        action_link: linkData.properties.action_link,
      })
      .eq("id", session_token).eq("status", "pending");

    if (updateError) throw new Error(updateError.message);

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
      status: 200,
    });
  }
});
