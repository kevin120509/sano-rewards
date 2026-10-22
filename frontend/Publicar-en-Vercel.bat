@echo off
title Publicar Sano Rewards en Vercel
cd /d "%~dp0"
echo === Sano Rewards (real, Supabase) -^> https://sano-rewards-real.vercel.app
set VERCEL_ORG_ID=team_GaYQnryhdXpdPpASuPwbkcYc
set VERCEL_PROJECT_ID=prj_4STSTsicz37U9EhLSihUbqPdS961
call vercel deploy --prod --yes --build-env VITE_SUPABASE_URL=https://xddzafjkmtxgwqmrcdwg.supabase.co --build-env VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ChpGqsPZWXGVlSfs5BvtJw_5PMn6czc
pause
