# Genera las plantillas de correo de Supabase (diseño café Sano, un solo diseño).
# Diseño café "Sano" (igual que CUSTOMER_SKIN en frontend/src/domain/themes.ts). Un solo diseño para todos los grupos.
T = dict(page='#E5E2DC', card='#F4F1EB', border='#D8D1C6', ink='#1F1A16', muted='#6E655C', head='#5E4B3D', headg='linear-gradient(135deg,#7A6250,#5E4B3D)', headink='#FFFFFF', font="Nunito,'Trebuchet MS',Arial,sans-serif", code='#5E4B3D', box='#FFF1D2', boxb='#8DB872', tag='CLIENTE CONSENTIDO', line='Cada visita suma. En la 8.ª, tu bebida va por la casa.')

def shell(t, inner):
    up = ''
    return f'''<div style="margin:0;padding:24px 12px;background:{t['page']};font-family:Arial,Helvetica,sans-serif;color:{t['ink']}">
<div style="max-width:480px;margin:0 auto;background:{t['card']};border-radius:18px;overflow:hidden;border:1px solid {t['border']}">
<div style="background:{t['head']};background:{t['headg']};padding:22px 24px;color:{t['headink']}">
<div style="font-family:{t['font']};font-size:26px;font-weight:bold;line-height:1;{up}">sano bistro</div>
<div style="font-size:11px;letter-spacing:4px;margin-top:6px">CAFÉ · SANO REWARDS · {t['tag']}</div>
</div>
<div style="padding:26px 24px 8px">{inner}</div>
<div style="padding:14px 24px 22px;border-top:1px solid {t['border']};font-size:12px;color:{t['muted']};text-align:center">{t['line']}<br>Sano Bistro Café · @sanobistro · 999 530 5545</div>
</div></div>'''

def code_inner(t):
    return f'''<p style="font-size:17px;margin:0 0 10px">¡Hola!</p>
<p style="font-size:15px;line-height:1.5;margin:0 0 18px">Este es tu código para entrar a tu tarjeta:</p>
<div style="text-align:center;margin:0 0 18px"><span style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:bold;color:{t['code']};background:{t['box']};border:2px dashed {t['boxb']};border-radius:14px;padding:14px 20px">{{{{ .Token }}}}</span></div>
<p style="font-size:14px;line-height:1.5;color:{t['muted']};margin:0 0 18px">Escríbelo en la app. Vence en una hora. Si no pediste este código, ignora este correo.</p>'''

def confirm_inner(t):
    return f'''<p style="font-size:17px;margin:0 0 10px">¡Bienvenido a Sano Rewards!</p>
<p style="font-size:15px;line-height:1.5;margin:0 0 18px">Confirma tu correo para activar tu tarjeta.</p>
<div style="text-align:center;margin:0 0 16px"><a href="{{{{ .ConfirmationURL }}}}" style="display:inline-block;background:{t['head']};color:{t['headink']};text-decoration:none;font-weight:bold;font-size:16px;border-radius:999px;padding:14px 28px">Confirmar mi correo</a></div>
<p style="font-size:14px;line-height:1.5;color:{t['muted']};margin:0 0 6px;text-align:center">O escribe este código en la app:</p>
<div style="text-align:center;margin:0 0 18px"><span style="font-size:26px;letter-spacing:8px;font-weight:bold;color:{t['code']}">{{{{ .Token }}}}</span></div>
<p style="font-size:13px;line-height:1.5;color:{t['muted']};margin:0 0 18px">Si no creaste esta cuenta, ignora este correo.</p>'''

def reset_inner(t):
    return f'''<p style="font-size:17px;margin:0 0 10px">¿Olvidaste tu contraseña?</p>
<p style="font-size:15px;line-height:1.5;margin:0 0 18px">No pasa nada. Toca el botón para crear una nueva y seguir sumando visitas.</p>
<div style="text-align:center;margin:0 0 16px"><a href="{{{{ .ConfirmationURL }}}}" style="display:inline-block;background:{t['head']};color:{t['headink']};text-decoration:none;font-weight:bold;font-size:16px;border-radius:999px;padding:14px 28px">Crear nueva contraseña</a></div>
<p style="font-size:13px;line-height:1.5;color:{t['muted']};margin:0 0 18px">El enlace vence en una hora. Si no lo pediste tú, ignora este correo: tu contraseña no cambia.</p>'''

def build(inner_fn):
    return shell(T, inner_fn(T))

for name, fn in (('codigo-acceso.html', code_inner), ('confirmar-registro.html', confirm_inner), ('restablecer-contrasena.html', reset_inner)):
    open(name, 'w', encoding='utf-8').write(build(fn))
# Vista previa para revisar el diseño (sin Go templates)
open('preview.html', 'w', encoding='utf-8').write(shell(T, code_inner(T)).replace('{{ .Token }}', '482913'))
print({f: len(open(f, encoding='utf-8').read()) for f in ['codigo-acceso.html', 'confirmar-registro.html', 'restablecer-contrasena.html']})
