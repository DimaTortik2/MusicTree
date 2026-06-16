import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS (чтобы браузер не блокировал запрос)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_token, redirect_to } = await req.json();
    if (!session_token) throw new Error("Не передан session_token");

    // 1. Достаем токен авторизации, который прислал телефон
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error(
        "Отсутствует заголовок Authorization. Телефон не прислал сессию.",
      );
    }
    const token = authHeader.replace("Bearer ", "");

    // Клиент для проверки юзера
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    // Клиент Админа (только он может выдавать Magic Link без писем)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 2. Проверяем токен: кто именно сканирует код?
    const { data: { user }, error: authError } = await supabaseClient.auth
      .getUser(token);

    if (authError) {
      throw new Error(`Ошибка проверки токена: ${authError.message}`);
    }
    if (!user) throw new Error("Пользователь не найден в базе");

    // 3. Проверяем права на фичу
    const { data: profile, error: profileError } = await supabaseAdmin.from(
      "profiles",
    )
      .select("can_use_qr_login")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new Error(`Ошибка БД профиля: ${profileError.message}`);
    }
    if (!profile?.can_use_qr_login) {
      throw new Error("Нет доступа к этой функции");
    }

    // 4. Генерируем магическую ссылку (action_link)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin
      .generateLink({
        type: "magiclink",
        email: user.email!,
         options: {
        redirectTo: redirect_to 
      }
      });

    if (linkError) {
      throw new Error(`Ошибка генерации ссылки: ${linkError.message}`);
    }

    // 5. Сохраняем ссылку в заявку
    const { error: updateError } = await supabaseAdmin.from("qr_auth_sessions")
      .update({
        status: "approved",
        user_id: user.id,
        action_link: linkData.properties.action_link,
      })
      .eq("id", session_token)
      .eq("status", "pending");

    if (updateError) {
      throw new Error(`Ошибка обновления заявки: ${updateError.message}`);
    }

    // Успех!
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Неизвестная ошибка";

    // Возвращаем status 200, чтобы фронтенд красиво прочитал текст ошибки
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
