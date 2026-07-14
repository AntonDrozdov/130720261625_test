using System.ComponentModel.DataAnnotations;

namespace RandomNumberApi.Models;

public sealed class ImageUploadRequest
{
    [Required, RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$", ErrorMessage = "Slug may contain lowercase Latin letters, numbers and hyphens.")]
    public string Slug { get; init; } = string.Empty;

    [Required, StringLength(300)]
    public string AltText { get; init; } = string.Empty;

    [StringLength(200)]
    public string? Title { get; init; }

    [StringLength(500)]
    public string? SeoDescription { get; init; }

    [Required]
    public IFormFile File { get; init; } = null!;
}
