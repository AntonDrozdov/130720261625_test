using Application.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public sealed class DesignProjectConfiguration : IEntityTypeConfiguration<DesignProject>
{
    public void Configure(EntityTypeBuilder<DesignProject> builder)
    {
        builder.ToTable("design_projects");
        builder.HasKey(project => project.Id);
        builder.Property(project => project.Id).ValueGeneratedNever();
        builder.Property(project => project.Name).HasMaxLength(200).IsRequired();
        builder.Property(project => project.SceneJson).HasColumnType("text").IsRequired();
        builder.Property(project => project.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP").IsRequired();
        builder.Property(project => project.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP").IsRequired();
    }
}
