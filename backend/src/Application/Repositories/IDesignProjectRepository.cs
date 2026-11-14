using Application.Entities;

namespace Application.Repositories;

public interface IDesignProjectRepository
{
    Task<IReadOnlyList<DesignProject>> GetProjects(CancellationToken cancellationToken = default);
    Task<DesignProject?> GetProject(Guid id, CancellationToken cancellationToken = default);
    Task<DesignProject?> GetProjectForUpdate(Guid id, CancellationToken cancellationToken = default);
    void Add(DesignProject project);
    Task SaveChanges(CancellationToken cancellationToken = default);
}
