using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Api.Contracts;

public sealed class SceneScreenshotRequest
{
    [Required] public IFormFile? Image { get; init; }
}
