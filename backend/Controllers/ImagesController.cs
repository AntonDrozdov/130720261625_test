using Microsoft.AspNetCore.Mvc;
using RandomNumberApi.Models;
using RandomNumberApi.Services;

namespace RandomNumberApi.Controllers;

[ApiController]
[Route("api/images")]
public sealed class ImagesController(ISiteImageRepository repository, IConfiguration configuration) : ControllerBase
{
    private static readonly HashSet<string> AllowedContentTypes =
        ["image/jpeg", "image/png", "image/webp", "image/avif"];

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<SiteImageMetadata>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SiteImageMetadata>>> List(CancellationToken cancellationToken)
        => Ok(await repository.ListAsync(cancellationToken));

    [HttpGet("{slug}")]
    [ResponseCache(Duration = 31536000, Location = ResponseCacheLocation.Any)]
    [Produces("image/jpeg", "image/png", "image/webp", "image/avif")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string slug, CancellationToken cancellationToken)
    {
        var image = await repository.GetAsync(slug, cancellationToken);
        if (image is null) return NotFound();

        var etag = $"\"{image.ContentHash}\"";
        if (Request.Headers.IfNoneMatch.Any(value => value == etag)) return StatusCode(StatusCodes.Status304NotModified);

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        Response.Headers.LastModified = image.UpdatedAt.ToUniversalTime().ToString("R");
        Response.Headers["X-Image-Alt"] = Uri.EscapeDataString(image.AltText);
        Response.Headers["Content-Disposition"] = $"inline; filename=\"{image.FileName}\"";
        return File(image.Data, image.ContentType, enableRangeProcessing: true);
    }

    [HttpGet("{slug}/metadata")]
    [ProducesResponseType<SiteImageMetadata>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SiteImageMetadata>> Metadata(string slug, CancellationToken cancellationToken)
    {
        var image = await repository.GetAsync(slug, cancellationToken);
        if (image is null) return NotFound();
        return Ok(new SiteImageMetadata(image.Slug, image.FileName, image.ContentType, image.Data.LongLength,
            image.AltText, image.Title, image.SeoDescription, $"/api/images/{image.Slug}", image.UpdatedAt));
    }

    [HttpPut]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(12_582_912)]
    [ProducesResponseType<SiteImageMetadata>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<SiteImageMetadata>> Upload([FromForm] ImageUploadRequest request, CancellationToken cancellationToken)
    {
        var configuredKey = configuration["ImageApi:UploadApiKey"];
        if (string.IsNullOrWhiteSpace(configuredKey) || Request.Headers["X-Image-Api-Key"] != configuredKey)
            return Unauthorized(new { error = "A valid X-Image-Api-Key header is required." });

        var maxBytes = configuration.GetValue<long>("ImageApi:MaxUploadBytes", 12_582_912);
        if (request.File.Length is 0 || request.File.Length > maxBytes)
            return BadRequest(new { error = $"Image size must be between 1 and {maxBytes} bytes." });
        if (!AllowedContentTypes.Contains(request.File.ContentType.ToLowerInvariant()))
            return BadRequest(new { error = "Allowed formats: JPEG, PNG, WebP and AVIF." });

        await using var stream = new MemoryStream();
        await request.File.CopyToAsync(stream, cancellationToken);
        var data = stream.ToArray();
        if (!HasValidSignature(data, request.File.ContentType))
            return BadRequest(new { error = "File contents do not match the declared image format." });

        var fileName = Path.GetFileName(request.File.FileName);
        await repository.UpsertAsync(request.Slug, fileName, request.File.ContentType.ToLowerInvariant(), data,
            request.AltText, request.Title, request.SeoDescription, cancellationToken);

        var response = new SiteImageMetadata(request.Slug, fileName, request.File.ContentType, data.LongLength,
            request.AltText, request.Title, request.SeoDescription, $"/api/images/{request.Slug}", DateTimeOffset.UtcNow);
        return CreatedAtAction(nameof(Metadata), new { request.Slug }, response);
    }

    private static bool HasValidSignature(byte[] data, string contentType) => contentType.ToLowerInvariant() switch
    {
        "image/png" => data.Length >= 8 && data.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
        "image/jpeg" => data.Length >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF,
        "image/webp" => data.Length >= 12 && data.AsSpan(0, 4).SequenceEqual("RIFF"u8) && data.AsSpan(8, 4).SequenceEqual("WEBP"u8),
        "image/avif" => data.Length >= 12 && data.AsSpan(4, 4).SequenceEqual("ftyp"u8),
        _ => false
    };
}
