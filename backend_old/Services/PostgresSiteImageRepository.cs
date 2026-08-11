using System.Security.Cryptography;
using Npgsql;
using RandomNumberApi.Models;

namespace RandomNumberApi.Services;

public sealed class PostgresSiteImageRepository(IConfiguration configuration) : ISiteImageRepository
{
    private readonly string _connectionString = configuration.GetConnectionString("Postgres")
        ?? throw new InvalidOperationException("Connection string 'Postgres' is not configured.");

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        const string sql = """
            CREATE TABLE IF NOT EXISTS site_images (
                id uuid PRIMARY KEY,
                slug varchar(120) NOT NULL UNIQUE,
                file_name varchar(255) NOT NULL,
                content_type varchar(100) NOT NULL,
                data bytea NOT NULL,
                alt_text varchar(300) NOT NULL,
                title varchar(200),
                seo_description varchar(500),
                content_hash char(64) NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_site_images_slug ON site_images (slug);
            """;

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<SiteImage?> GetAsync(string slug, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id, slug, file_name, content_type, data, alt_text, title,
                   seo_description, content_hash, created_at, updated_at
            FROM site_images WHERE slug = @slug;
            """;

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("slug", slug);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return null;

        return new SiteImage(
            reader.GetGuid(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
            (byte[])reader[4], reader.GetString(5), reader.IsDBNull(6) ? null : reader.GetString(6),
            reader.IsDBNull(7) ? null : reader.GetString(7), reader.GetString(8),
            reader.GetFieldValue<DateTimeOffset>(9), reader.GetFieldValue<DateTimeOffset>(10));
    }

    public async Task<IReadOnlyList<SiteImageMetadata>> ListAsync(CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT slug, file_name, content_type, octet_length(data), alt_text, title,
                   seo_description, updated_at FROM site_images ORDER BY slug;
            """;
        var result = new List<SiteImageMetadata>();
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var slug = reader.GetString(0);
            result.Add(new SiteImageMetadata(slug, reader.GetString(1), reader.GetString(2), reader.GetInt64(3),
                reader.GetString(4), reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.IsDBNull(6) ? null : reader.GetString(6), $"/api/images/{slug}",
                reader.GetFieldValue<DateTimeOffset>(7)));
        }
        return result;
    }

    public async Task UpsertAsync(string slug, string fileName, string contentType, byte[] data, string altText, string? title, string? seoDescription, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO site_images (id, slug, file_name, content_type, data, alt_text, title, seo_description, content_hash)
            VALUES (@id, @slug, @fileName, @contentType, @data, @altText, @title, @seoDescription, @hash)
            ON CONFLICT (slug) DO UPDATE SET
                file_name = EXCLUDED.file_name, content_type = EXCLUDED.content_type,
                data = EXCLUDED.data, alt_text = EXCLUDED.alt_text, title = EXCLUDED.title,
                seo_description = EXCLUDED.seo_description, content_hash = EXCLUDED.content_hash,
                updated_at = now();
            """;
        var hash = Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", Guid.NewGuid());
        command.Parameters.AddWithValue("slug", slug);
        command.Parameters.AddWithValue("fileName", fileName);
        command.Parameters.AddWithValue("contentType", contentType);
        command.Parameters.AddWithValue("data", data);
        command.Parameters.AddWithValue("altText", altText);
        command.Parameters.AddWithValue("title", (object?)title ?? DBNull.Value);
        command.Parameters.AddWithValue("seoDescription", (object?)seoDescription ?? DBNull.Value);
        command.Parameters.AddWithValue("hash", hash);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
