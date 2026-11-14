using System.ComponentModel.DataAnnotations;

namespace Api.Contracts;

public sealed class CreateDesignProjectRequest
{
    [Required, MaxLength(200)] public string Name { get; init; } = string.Empty;
}

public sealed class SaveDesignProjectRequest
{
    [Required, MaxLength(200)] public string Name { get; init; } = string.Empty;
    [Required, MaxLength(2_000_000)] public string SceneJson { get; init; } = string.Empty;
}

public sealed record DesignProjectSummaryResponse(Guid Id, string Name, DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record DesignProjectResponse(Guid Id, string Name, string SceneJson, DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
