# MWCraft image API

## PostgreSQL configuration

Create an empty `mwcraft` database. The API creates the `site_images` table and
indexes automatically, then imports files from `SeedImages` when their slugs do
not exist yet.

Do not keep production credentials in `appsettings.json`. Configure them with
environment variables before starting the backend:

```powershell
$env:ConnectionStrings__Postgres = 'Host=localhost;Port=5432;Database=mwcraft;Username=mwcraft;Password=<password>'
$env:ImageApi__UploadApiKey = '<long-random-secret>'
dotnet run --launch-profile http
```

## Endpoints

- `GET /api/images` — image metadata list without binary data.
- `GET /api/images/{slug}` — image bytes with MIME type, ETag, Last-Modified,
  range support, and long-lived immutable caching.
- `GET /api/images/{slug}/metadata` — SEO metadata for one image.
- `PUT /api/images` — create or replace an image using `multipart/form-data`.

Upload requires the `X-Image-Api-Key` header. Form fields are `slug`, `altText`,
`title`, `seoDescription`, and `file`. Accepted formats are PNG, JPEG, WebP and
AVIF, up to 12 MiB by default.

```powershell
curl.exe -X PUT http://localhost:5000/api/images `
  -H "X-Image-Api-Key: <long-random-secret>" `
  -F "slug=example-image" `
  -F "altText=Описание изображения для поисковых систем" `
  -F "title=Название изображения" `
  -F "seoDescription=Расширенное SEO-описание" `
  -F "file=@C:\path\image.webp;type=image/webp"
```

For production, route `/api` from the public website domain to this ASP.NET
Core application. That keeps image URLs on the same domain as the page. After a
domain is assigned, use absolute URLs in Open Graph and Schema.org metadata.
