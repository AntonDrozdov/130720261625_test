using Application.Entities;
using Application.Repositories;
using Application.Services;

namespace Infrastructure.Services;

public sealed class DesignProjectService(IDesignProjectRepository repository) : IDesignProjectService
{
    private const string EmptyScene = "{\"objects\":[]}";

    public Task<IReadOnlyList<DesignProject>> GetProjects(CancellationToken cancellationToken = default)
        => repository.GetProjects(cancellationToken);

    public Task<DesignProject?> GetProject(Guid id, CancellationToken cancellationToken = default)
        => repository.GetProject(id, cancellationToken);

    public async Task<DesignProject> Create(string name, CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var project = new DesignProject
        {
            Id = Guid.NewGuid(), Name = name.Trim(), SceneJson = EmptyScene, CreatedAt = now, UpdatedAt = now
        };
        repository.Add(project);
        await repository.SaveChanges(cancellationToken);
        return project;
    }

    public async Task<DesignProject?> Save(Guid id, string name, string sceneJson,
        CancellationToken cancellationToken = default)
    {
        var project = await repository.GetProjectForUpdate(id, cancellationToken);
        if (project is null) return null;
        project.Name = name.Trim();
        project.SceneJson = sceneJson;
        project.UpdatedAt = DateTimeOffset.UtcNow;
        await repository.SaveChanges(cancellationToken);
        return project;
    }
}
