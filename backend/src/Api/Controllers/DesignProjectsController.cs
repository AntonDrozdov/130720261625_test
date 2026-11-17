using System.Text.Json;
using Api.Contracts;
using Application.Entities;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/design-projects")]
public sealed class DesignProjectsController(IDesignProjectService projectService, IWebHostEnvironment environment,
    IConfiguration configuration) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DesignProjectSummaryResponse>>> GetProjects(
        CancellationToken cancellationToken)
        => Ok((await projectService.GetProjects(cancellationToken)).Select(ToSummary));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DesignProjectResponse>> GetProject(Guid id, CancellationToken cancellationToken)
    {
        var project = await projectService.GetProject(id, cancellationToken);
        return project is null ? NotFound() : Ok(ToResponse(project));
    }

    [HttpPost]
    public async Task<ActionResult<DesignProjectResponse>> CreateProject(CreateDesignProjectRequest request,
        CancellationToken cancellationToken)
    {
        var project = await projectService.Create(request.Name, cancellationToken);
        return CreatedAtAction(nameof(GetProject), new { id = project.Id }, ToResponse(project));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DesignProjectResponse>> SaveProject(Guid id, SaveDesignProjectRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            _ = JsonDocument.Parse(request.SceneJson);
        }
        catch (JsonException)
        {
            return BadRequest("SceneJson must contain valid JSON.");
        }

        var project = await projectService.Save(id, request.Name, request.SceneJson, cancellationToken);
        return project is null ? NotFound() : Ok(ToResponse(project));
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<DesignProjectResponse>> RenameProject(Guid id, CreateDesignProjectRequest request,
        CancellationToken cancellationToken)
    {
        var project = await projectService.Rename(id, request.Name, cancellationToken);
        return project is null ? NotFound() : Ok(ToResponse(project));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProject(Guid id, CancellationToken cancellationToken)
        => await projectService.Delete(id, cancellationToken) ? NoContent() : NotFound();

    [HttpPost("{id:guid}/screenshots")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<IActionResult> SaveScreenshot(Guid id, [FromForm] SceneScreenshotRequest request,
        CancellationToken cancellationToken)
    {
        if (await projectService.GetProject(id, cancellationToken) is null) return NotFound();
        var image = request.Image;
        if (image is null || image.Length < 24 || image.Length > 10 * 1024 * 1024)
            return BadRequest("PNG screenshot must be between 24 bytes and 10 MB.");
        await using var input = image.OpenReadStream();
        var header = new byte[24];
        await input.ReadExactlyAsync(header, cancellationToken);
        byte[] signature = [137, 80, 78, 71, 13, 10, 26, 10];
        if (!header.AsSpan(0, 8).SequenceEqual(signature) || !header.AsSpan(12, 4).SequenceEqual("IHDR"u8))
            return BadRequest("Only PNG screenshots are supported.");

        var directory = Path.GetFullPath(configuration["Screenshots:Directory"] ?? "screenshots", environment.ContentRootPath);
        Directory.CreateDirectory(directory);
        var fileName = $"{id:N}_{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}.png";
        var path = Path.Combine(directory, fileName);
        try
        {
            await using var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, true);
            await output.WriteAsync(header, cancellationToken);
            await input.CopyToAsync(output, cancellationToken);
        }
        catch
        {
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
            throw;
        }
        return Ok(new { fileName, path = $"screenshots/{fileName}" });
    }

    private static DesignProjectSummaryResponse ToSummary(DesignProject project)
        => new(project.Id, project.Name, project.CreatedAt, project.UpdatedAt);

    private static DesignProjectResponse ToResponse(DesignProject project)
        => new(project.Id, project.Name, project.SceneJson, project.CreatedAt, project.UpdatedAt);
}
