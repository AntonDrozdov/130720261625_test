using System.Text.Json;
using Api.Contracts;
using Application.Entities;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/design-projects")]
public sealed class DesignProjectsController(IDesignProjectService projectService) : ControllerBase
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

    private static DesignProjectSummaryResponse ToSummary(DesignProject project)
        => new(project.Id, project.Name, project.CreatedAt, project.UpdatedAt);

    private static DesignProjectResponse ToResponse(DesignProject project)
        => new(project.Id, project.Name, project.SceneJson, project.CreatedAt, project.UpdatedAt);
}
