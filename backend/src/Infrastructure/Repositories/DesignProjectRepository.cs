using Application.Entities;
using Application.Repositories;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class DesignProjectRepository(ApplicationDbContext dbContext) : IDesignProjectRepository
{
    public async Task<IReadOnlyList<DesignProject>> GetProjects(CancellationToken cancellationToken = default)
        => await dbContext.DesignProjects.AsNoTracking().OrderByDescending(project => project.UpdatedAt)
            .ToListAsync(cancellationToken);

    public Task<DesignProject?> GetProject(Guid id, CancellationToken cancellationToken = default)
        => dbContext.DesignProjects.AsNoTracking().SingleOrDefaultAsync(project => project.Id == id, cancellationToken);

    public Task<DesignProject?> GetProjectForUpdate(Guid id, CancellationToken cancellationToken = default)
        => dbContext.DesignProjects.SingleOrDefaultAsync(project => project.Id == id, cancellationToken);

    public void Add(DesignProject project) => dbContext.DesignProjects.Add(project);
    public void Remove(DesignProject project) => dbContext.DesignProjects.Remove(project);

    public Task SaveChanges(CancellationToken cancellationToken = default) => dbContext.SaveChangesAsync(cancellationToken);
}
