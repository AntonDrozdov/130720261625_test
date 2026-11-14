namespace Application.Entities;

public sealed class DesignProject
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string SceneJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
