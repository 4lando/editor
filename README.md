# Landofile Editor

A web-based YAML editor for Lando configuration files with real-time validation and schema support.

## Features

- **🎨 YAML Syntax Highlighting**: Custom syntax highlighting optimized for Landofiles
- **✅ Real-time Validation**: Validates against the community-driven [Lando schema specification](https://github.com/4lando/lando-spec)
- **📝 Schema-aware Tooltips**: Hover over properties to see:
  - Property descriptions
  - Type information
  - Allowed values
  - Default values
  - Usage examples
- **⚠️ Error Highlighting**: Precise error locations with helpful messages
- **🎯 Schema-aware Autocomplete**: Suggestions based on the current context
- **🌙 Dark Mode Support**: Switch between light and dark themes with auto-detection

All schema-powered features (validation, suggestions, hover tooltips, etc) are driven by the community-driven [Lando schema specification](https://github.com/4lando/lando-spec), ensuring accuracy and consistency with Lando's configuration format.

## Development

### Prerequisites

- [Lando](https://docs.lando.dev/install)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/lando/landofile-editor.git
cd landofile-editor
```

2. Start the development environment:

```bash
lando start
```

The editor will be available at `https://landofile-editor.lndo.site`.

### Building

To create a production build:

```bash
lando build
```
The editor will be available at `https://landofile-editor.lndo.site/public`.

### Development Notes

- Uses Vite for fast development and building
- Monaco Editor for code editing capabilities
- Tailwind CSS for styling
- PostCSS for CSS processing
- Custom theme based on Lando brand colors

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

GPL-3.0-or-later