using RandomNumberApi.Models;

namespace RandomNumberApi.Services;

public interface ISiteImageRepository
{
    Task InitializeAsync(CancellationToken cancellationToken = default);
    Task<SiteImage?> GetAsync(string slug, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SiteImageMetadata>> ListAsync(CancellationToken cancellationToken = default);
    Task UpsertAsync(string slug, string fileName, string contentType, byte[] data, string altText, string? title, string? seoDescription, CancellationToken cancellationToken = default);
}
