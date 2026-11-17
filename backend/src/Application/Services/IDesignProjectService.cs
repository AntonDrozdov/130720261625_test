using Application.Entities;

namespace Application.Services;

public interface IDesignProjectService
{
    Task<IReadOnlyList<DesignProject>> GetProjects(CancellationToken cancellationToken = default);
    Task<DesignProject?> GetProject(Guid id, CancellationToken cancellationToken = default);
    Task<DesignProject> Create(string name, CancellationToken cancellationToken = default);
    Task<DesignProject?> Save(Guid id, string name, string sceneJson, CancellationToken cancellationToken = default);
    Task<DesignProject?> Rename(Guid id, string name, CancellationToken cancellationToken = default);
    Task<bool> Delete(Guid id, CancellationToken cancellationToken = default);
}
