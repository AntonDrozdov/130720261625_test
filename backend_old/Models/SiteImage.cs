namespace RandomNumberApi.Models;

public sealed record SiteImage(
    Guid Id,
    string Slug,
    string FileName,
    string ContentType,
    byte[] Data,
    string AltText,
    string? Title,
    string? SeoDescription,
    string ContentHash,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record SiteImageMetadata(
    string Slug,
    string FileName,
    string ContentType,
    long Size,
    string AltText,
    string? Title,
    string? SeoDescription,
    string Url,
    DateTimeOffset UpdatedAt);
