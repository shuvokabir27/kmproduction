# KM Shop-only Conversion Plan

পুরো টিম/প্রোডাকশন সিস্টেম সম্পূর্ণ মুছে ফেলা হবে। সাইটে শুধু **KM Shop** (পণ্য বিক্রির ই-কমার্স) থাকবে।

## ১. নতুন রুট ম্যাপ (মোট ১৫টি)

**Public/Customer:**
- `/` → Shop home (Products list, FeaturedProductsSection, BestSellersSection, ShopOfferBanner)
- `/products` → All products
- `/products/:slug` → Product detail
- `/categories` → All categories
- `/categories/:slug` → Category products
- `/offers/:slug` → Shop offer page
- `/free-delivery` → Free delivery campaign
- `/cart` → Cart drawer page (existing CartDrawer)
- `/account` → ShopCustomerAccount
- `/account/login` → ShopCustomerLogin
- `/order/check` → Order check by phone
- `/download` → DownloadApp (keep)
- `/reset-password` → ResetPassword (keep, for product_admin only)

**Admin (product_admin role only):**
- `/admin/login` → admin login (email)
- `/admin` → AdminProducts (default landing)
- `/admin/products` → product manager
- `/admin/orders` → OrderManagement
- `/admin/customers` → ShopCustomersAdmin
- `/admin/categories` → CategoryManager
- `/admin/offers` → ShopOfferManager
- `/admin/home-sections` → HomeSectionsManager
- `/admin/landing-pages` → landing page sections editor
- `/admin/delivery` → AdminDeliverySettings
- `/admin/free-delivery` → FreeDeliveryCampaignManager
- `/admin/footer` → ShopFooterEditor
- `/admin/reviews` → product reviews moderation
- `/admin/settings` → minimal site settings (shop name/logo/contact)

## ২. ফাইল ডিলিট (~১৩০টি)

### Pages মুছবে (38)
AdminAccountChecking, AdminActorEditor, AdminAdvances, AdminAppVersions, AdminAttendance, AdminBonuses, AdminBookings, AdminChannels, AdminContactSettings, AdminDashboard, AdminFeatureToggles, AdminFreelance, AdminGallery, AdminMembers, AdminNews, AdminNotices, AdminPayments, AdminPopularVideos, AdminPublicProfiles, AdminRoleManagement, AdminSalaryUpdates, AdminScriptEdit, AdminScripts, AdminServices, AdminShootingExpenses, AdminShootings, AdminVoiceNotes, ActorPortfolio, Chat, ClientDashboard, ClientPaymentHistory, ClientProjects, FreelanceClientView, MemberDashboard, MemberScripts, MemberSettings, News, NewsCard, PhotoCard, PublicHome, PublicProfile, PublisherProfile, ServiceDetail, Services, ScriptDrawing, TasksPage, AllNotifications, Login (পুরো নতুন করে customer + admin আলাদা)

### Components মুছবে (~70)
AdminAdvanceRequestsCard, AdminMarqueeEditor, AdminPollCreate, AdminTicker, AdvanceRequestCard, BankSelect, BirthdayCountdownBar, BirthdayWishCard, BkashBalanceCards, ClientArtistBilling, ClientArtistReceipt, ClientBottomNav, ClientMemberList, ClientPaymentReceipt, ClientProjectExpenses, ClientProjectScript, ClientSceneEditor, CustomHomeSections, DailyRashifal, HomeTopSection, LiveClockBar, MemberBadges, MemberDeleteDialog, MemeGenerator, MobileBankSelect, MobileBottomNav, MonthlyExpenseChart, MonthlyIncomeCharts, NewsTickerBar, NoticeBoard, NoticeComments, OnlineUsersBar, OnlineUsersButton, PaymentReceipt, PermissionGuard, PollCard, ProfileReviews, PublicBirthdaySection, RichTextEditor, ScriptEditor, ScrollingTextEditor, ShootingSceneTracker, SiteSettingsDialog, UpdateNoticeMarquee, WatermarkedImage, WeatherWidget, ZeroBalanceFun, chat/* (ChatMessages, ChatPopup, ConversationList, NewChatDialog, NewChatInline), news/* (NewsDetail, NewsTicker), AppSidebar, AppLayout (member theme), NotificationBell, NavLink (যদি শুধু এখানে use), BirthdayWishCard

### Hooks/lib মুছবে
useMemberBalance, usePresence, useUnreadMessages, usePushNotifications, useFeatureFlags, useLanguage, lib/billPdf, lib/lineupPdf, lib/sendTeamSms, lib/sounds, lib/voiceNotesExport

### Edge functions ডিলিট (২২টি)
admin-phone-login, change-email-otp, change-member-email, client-login, create-client-artist, create-client, create-member, credit-monthly-salaries, delete-member, generate-birthday-wish, generate-funny-message, generate-meme, get-vapid-key, member-login, news-feed, og-news, password-reset-otp, send-monthly-account-summary, send-push-notification, send-team-sms, set-member-password, transcribe-voice

**রাখা হবে:** setup-shop-admin, shop-customer-auth

## ৩. Database — ৫২টি টেবিল ড্রপ

**Team/member tables (drop):** profiles, user_roles (পরে নতুন করে শুধু product_admin সহ), member_permissions, member_tasks, member_achievements, attendance, payments, salary_changes, salary_credits, salary_updates, bonuses, advance_requests, advance_deductions, shootings, shooting_expenses, shooting_participants, shooting_scenes, scripts, script_permissions, script_comments, freelance_projects, freelance_assignments, freelance_payments, freelance_scenes, client_artists, client_payment_history, client_profiles, client_project_artists, client_project_expenses, conversations, conversation_members, messages, calls, notices, notice_comments, notifications, push_subscriptions, polls, poll_options, poll_votes, voice_notes, voice_note_clips, news, news_categories, news_publishers, news_ticker, channels, popular_videos, gallery_images, actor_credits, actor_portfolio_images, services, service_offers, bookings, app_versions, marquee_settings, birthday_wishes, memes, favorite_works, profile_comments, profile_ratings, feature_flags, admin_phone_logins, login_attempts, password_reset_otps, vapid_keys, site_settings (replaced with shop-only minimal table)

**Keep (Shop):** products, product_categories, product_weight_prices, product_reviews, orders, shop_customers, shop_offers, customer_password_otps, delivery_settings, free_delivery_campaigns, free_delivery_campaign_products, free_delivery_campaign_tiers, free_delivery_orders, home_sections, home_section_products, landing_page_sections

**New:** `app_role` enum → শুধু `'product_admin'`, `'customer'` (বা শুধু product_admin)। `user_roles` টেবিল রিক্রিয়েট ছোট আকারে।

**Functions drop:** notify_member, notify_all_members, on_* (notice, shooting, attendance, payment, task, advance, salary_change, script_permission, notice_comment), grant_member_achievements, grant_all_member_achievements, has_permission, member_owns_client_artist_row, member_can_access_freelance_project, send_birthday_notifications, detect_advance_payment, sync_artist_name_on_profile_update, sync_freelance_projects_client_name, enforce_advance_request_limits, auto_deduct_advance_on_attendance, get_profiles_safe, get_public_profile_by_member_id, get_public_profiles, get_approved_profile_comments, get_shared_freelance_*, is_conversation_member, is_conversation_creator, handle_new_user (নতুন করে: শুধু default customer role assign)

**Storage buckets drop:** member-photos, gallery, news-images, client-scripts, voice-notes, receipts (keep: product-images, app-downloads)

## ৪. নতুন/আপডেট ফাইল

- `src/App.tsx` → পুরো rewrite, শুধু shop রুট
- `src/components/ShopLayout.tsx` (নতুন) → header (logo, cart, account), footer, MobileShopNav
- `src/components/ShopAdminLayout.tsx` (নতুন) → product_admin sidebar শুধু
- `src/hooks/useAuth.tsx` → simplify (শুধু product_admin + shop customer auth)
- `src/components/RouteGuard.tsx` → শুধু `product_admin` allowed role
- `index.html` → title/meta KM Shop
- `src/index.css` → member-theme classes মুছবে
- `mem://index.md` → পুরো পুনর্লিখন (team-related memory file গুলো মুছবে)
- `.lovable/plan.md` → archive

## ৫. কাজের ক্রম

1. **Migration** — সব টিম টেবিল/function ড্রপ (CASCADE), user_roles নতুন করে, handle_new_user নতুন
2. **Storage buckets delete** (admin tools)
3. **Edge functions delete** (২২টি)
4. **Code delete** — pages, components, hooks, lib (parallel `rm`)
5. **Rewrite** — App.tsx, useAuth, RouteGuard, ShopLayout, ShopAdminLayout, Login, index.html
6. **Verify** — build pass, preview shop home লোড হয়

## ৬. Risks

- Auto-generated `src/integrations/supabase/types.ts` migration approved হওয়ার পর regenerate হবে; নতুন কোড সেটার পরেই কাজ করবে। তাই migration আগে চলবে, কোড পরিবর্তন পরে।
- product_admin login flow (`setup-shop-admin` edge function + `admin_phone_logins` টেবিল) — `admin_phone_logins` table drop list এ আছে কিন্তু shop-admin phone-based login এ লাগে। **এটা keep করব।**
- Shop customer auth (`shop-customer-auth`) — keep।
- যেহেতু profiles drop হচ্ছে, products এ `created_by` ইত্যাদি যেকোনো FK পরিষ্কার করতে হবে।

Approve হলে migration দিয়ে শুরু করব।
