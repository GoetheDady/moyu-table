# TODO

## 待开发

- **QQ 邮箱验证码发送**：当前验证码仅在终端打印（开发模式），需接入 QQ 邮箱 SMTP 真实发送。使用 Nodemailer + QQ 邮箱授权码。涉及 `src/data/authRepository.ts`、`app/api/auth/verify-code/route.ts`、`app/api/auth/forgot-password/route.ts`、`src/features/auth/AuthModal.tsx`。
