<?php

/**
 * Library Builder - Uses PHP Reflection to analyze functions and classes
 * Creates a JSON representation of all available functions and classes
 * 
 * Designed to be easily portable to other languages with reflection capabilities
 */

/**
 * Data structures for representing analyzed code elements
 */
class TypeInfo
{
    public string $kind;
    public ?string $name;
    public ?bool $isBuiltin;
    public bool $allowsNull;
    public ?array $types; // For union/intersection types
    public ?string $stringRepresentation;

    public function __construct(
        string $kind,
        ?string $name = null,
        ?bool $isBuiltin = null,
        bool $allowsNull = false,
        ?array $types = null,
        ?string $stringRepresentation = null
    ) {
        $this->kind = $kind;
        $this->name = $name;
        $this->isBuiltin = $isBuiltin;
        $this->allowsNull = $allowsNull;
        $this->types = $types;
        $this->stringRepresentation = $stringRepresentation;
    }

    public function toArray(): array
    {
        $result = ['kind' => $this->kind, 'allows_null' => $this->allowsNull];
        
        if ($this->name !== null) $result['name'] = $this->name;
        if ($this->isBuiltin !== null) $result['is_builtin'] = $this->isBuiltin;
        if ($this->types !== null) $result['types'] = $this->types;
        if ($this->stringRepresentation !== null) $result['string_representation'] = $this->stringRepresentation;
        
        return $result;
    }
}

class ParameterInfo
{
    public string $name;
    public int $position;
    public ?TypeInfo $type;
    public bool $isOptional;
    public bool $isVariadic;
    public bool $isPassedByReference;
    public bool $hasDefaultValue;
    public $defaultValue;
    public bool $allowsNull;
    public array $attributes;

    public function __construct(
        string $name,
        int $position,
        ?TypeInfo $type = null,
        bool $isOptional = false,
        bool $isVariadic = false,
        bool $isPassedByReference = false,
        bool $hasDefaultValue = false,
        $defaultValue = null,
        bool $allowsNull = false,
        array $attributes = []
    ) {
        $this->name = $name;
        $this->position = $position;
        $this->type = $type;
        $this->isOptional = $isOptional;
        $this->isVariadic = $isVariadic;
        $this->isPassedByReference = $isPassedByReference;
        $this->hasDefaultValue = $hasDefaultValue;
        $this->defaultValue = $defaultValue;
        $this->allowsNull = $allowsNull;
        $this->attributes = $attributes;
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'position' => $this->position,
            'type' => $this->type?->toArray(),
            'is_optional' => $this->isOptional,
            'is_variadic' => $this->isVariadic,
            'is_passed_by_reference' => $this->isPassedByReference,
            'has_default_value' => $this->hasDefaultValue,
            'default_value' => $this->defaultValue,
            'allows_null' => $this->allowsNull,
            'attributes' => $this->attributes
        ];
    }
}

class FunctionInfo
{
    public string $name;
    public string $namespace;
    public ?string $file;
    public ?int $line;
    public array $parameters;
    public ?TypeInfo $returnType;
    public bool $isVariadic;
    public bool $isGenerator;
    public ?string $docComment;
    public array $attributes;

    public function __construct(
        string $name,
        string $namespace = '',
        ?string $file = null,
        ?int $line = null,
        array $parameters = [],
        ?TypeInfo $returnType = null,
        bool $isVariadic = false,
        bool $isGenerator = false,
        ?string $docComment = null,
        array $attributes = []
    ) {
        $this->name = $name;
        $this->namespace = $namespace;
        $this->file = $file;
        $this->line = $line;
        $this->parameters = $parameters;
        $this->returnType = $returnType;
        $this->isVariadic = $isVariadic;
        $this->isGenerator = $isGenerator;
        $this->docComment = $docComment;
        $this->attributes = $attributes;
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'namespace' => $this->namespace,
            'file' => $this->file,
            'line' => $this->line,
            'parameters' => array_map(fn($p) => $p->toArray(), $this->parameters),
            'return_type' => $this->returnType?->toArray(),
            'is_variadic' => $this->isVariadic,
            'is_generator' => $this->isGenerator,
            'doc_comment' => $this->docComment,
            'attributes' => $this->attributes
        ];
    }
}

class PropertyInfo
{
    public string $name;
    public string $visibility;
    public bool $isStatic;
    public bool $isReadonly;
    public bool $hasDefaultValue;
    public $defaultValue;
    public ?TypeInfo $type;
    public string $declaringClass;
    public ?string $docComment;
    public array $attributes;

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'visibility' => $this->visibility,
            'is_static' => $this->isStatic,
            'is_readonly' => $this->isReadonly,
            'has_default_value' => $this->hasDefaultValue,
            'default_value' => $this->defaultValue,
            'type' => $this->type?->toArray(),
            'declaring_class' => $this->declaringClass,
            'doc_comment' => $this->docComment,
            'attributes' => $this->attributes
        ];
    }
}

class ConstantInfo
{
    public string $name;
    public $value;
    public string $visibility;
    public bool $isFinal;
    public string $declaringClass;
    public ?string $docComment;
    public array $attributes;

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'value' => $this->value,
            'visibility' => $this->visibility,
            'is_final' => $this->isFinal,
            'declaring_class' => $this->declaringClass,
            'doc_comment' => $this->docComment,
            'attributes' => $this->attributes
        ];
    }
}

class MethodInfo extends FunctionInfo
{
    public string $visibility;
    public bool $isStatic;
    public bool $isAbstract;
    public bool $isFinal;
    public bool $isConstructor;
    public bool $isDestructor;
    public string $declaringClass;

    public function toArray(): array
    {
        $base = parent::toArray();
        return array_merge($base, [
            'visibility' => $this->visibility,
            'is_static' => $this->isStatic,
            'is_abstract' => $this->isAbstract,
            'is_final' => $this->isFinal,
            'is_constructor' => $this->isConstructor,
            'is_destructor' => $this->isDestructor,
            'declaring_class' => $this->declaringClass
        ]);
    }
}

class ClassInfo
{
    public string $name;
    public string $shortName;
    public string $namespace;
    public ?string $file;
    public ?int $line;
    public bool $isAbstract;
    public bool $isFinal;
    public bool $isInterface;
    public bool $isTrait;
    public bool $isEnum;
    public ?string $parentClass;
    public array $interfaces;
    public array $traits;
    public array $constants;
    public array $properties;
    public array $methods;
    public ?string $docComment;
    public array $attributes;

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'short_name' => $this->shortName,
            'namespace' => $this->namespace,
            'file' => $this->file,
            'line' => $this->line,
            'is_abstract' => $this->isAbstract,
            'is_final' => $this->isFinal,
            'is_interface' => $this->isInterface,
            'is_trait' => $this->isTrait,
            'is_enum' => $this->isEnum,
            'parent_class' => $this->parentClass,
            'interfaces' => $this->interfaces,
            'traits' => $this->traits,
            'constants' => array_map(fn($c) => $c->toArray(), $this->constants),
            'properties' => array_map(fn($p) => $p->toArray(), $this->properties),
            'methods' => array_map(fn($m) => $m->toArray(), $this->methods),
            'doc_comment' => $this->docComment,
            'attributes' => $this->attributes
        ];
    }
}

/**
 * Core reflection utilities - can be ported to other languages
 */
class ReflectionUtils
{
    /**
     * Check if parameter has default value (version agnostic)
     */
    public static function parameterHasDefaultValue(ReflectionParameter $parameter): bool
    {
        if (method_exists($parameter, 'hasDefaultValue')) {
            return $parameter->hasDefaultValue();
        }
        return $parameter->isOptional() && !$parameter->isVariadic();
    }

    /**
     * Check if property has default value (version agnostic)
     */
    public static function propertyHasDefaultValue(ReflectionProperty $property): bool
    {
        if (method_exists($property, 'hasDefaultValue')) {
            return $property->hasDefaultValue();
        }
        
        try {
            $property->getDefaultValue();
            return true;
        } catch (ReflectionException $e) {
            return false;
        }
    }

    /**
     * Get parameter default value safely
     */
    public static function getParameterDefaultValue(ReflectionParameter $parameter)
    {
        try {
            return $parameter->getDefaultValue();
        } catch (ReflectionException $e) {
            return '<internal>';
        }
    }

    /**
     * Get property default value safely
     */
    public static function getPropertyDefaultValue(ReflectionProperty $property)
    {
        try {
            return $property->getDefaultValue();
        } catch (ReflectionException $e) {
            return null;
        }
    }

    /**
     * Get visibility string
     */
    public static function getVisibility($reflection): string
    {
        if ($reflection->isPrivate()) return 'private';
        if ($reflection->isProtected()) return 'protected';
        return 'public';
    }

    /**
     * Get attributes array (version agnostic)
     */
    public static function getAttributes($reflection): array
    {
        if (!method_exists($reflection, 'getAttributes')) {
            return [];
        }

        $attributes = [];
        foreach ($reflection->getAttributes() as $attribute) {
            $attributes[] = [
                'name' => $attribute->getName(),
                'arguments' => $attribute->getArguments(),
                'target' => $attribute->getTarget()
            ];
        }
        
        return $attributes;
    }
}

/**
 * Type analysis - handles different type systems
 */
class TypeAnalyzer
{
    /**
     * Convert reflection type to TypeInfo object
     */
    public static function analyzeType(?ReflectionType $type): ?TypeInfo
    {
        if (!$type) {
            return null;
        }

        if ($type instanceof ReflectionUnionType) {
            return new TypeInfo(
                kind: 'union',
                allowsNull: $type->allowsNull(),
                types: array_map(fn($t) => self::analyzeType($t)?->toArray(), $type->getTypes())
            );
        }

        if ($type instanceof ReflectionIntersectionType) {
            return new TypeInfo(
                kind: 'intersection',
                allowsNull: $type->allowsNull(),
                types: array_map(fn($t) => self::analyzeType($t)?->toArray(), $type->getTypes())
            );
        }

        if ($type instanceof ReflectionNamedType) {
            return new TypeInfo(
                kind: 'named',
                name: $type->getName(),
                isBuiltin: $type->isBuiltin(),
                allowsNull: $type->allowsNull()
            );
        }

        return new TypeInfo(
            kind: 'unknown',
            allowsNull: $type->allowsNull(),
            stringRepresentation: (string)$type
        );
    }
}

/**
 * Main analyzer class - orchestrates the analysis
 */
class LibraryAnalyzer
{
    private array $library;

    public function __construct()
    {
        $this->library = [
            'functions' => [],
            'classes' => [],
            'generated_at' => date('Y-m-d H:i:s'),
            'php_version' => PHP_VERSION
        ];
    }

    /**
     * Analyze all user-defined functions
     */
    public function analyzeFunctions(): void
    {
        $functions = get_defined_functions()['user'];
        
        foreach ($functions as $functionName) {
            $functionInfo = FunctionAnalyzer::analyzeFunction($functionName);
            if ($functionInfo) {
                $this->library['functions'][] = $functionInfo->toArray();
            }
        }
    }

    /**
     * Analyze all user-defined classes
     */
    public function analyzeClasses(): void
    {
        $classes = get_declared_classes();
        
        foreach ($classes as $className) {
            if ((new ReflectionClass($className))->isUserDefined()) {
                $classInfo = ClassAnalyzer::analyzeClass($className);
                if ($classInfo) {
                    $this->library['classes'][] = $classInfo->toArray();
                }
            }
        }
    }

    /**
     * Add a specific function to analyze
     */
    public function addFunction(string $functionName): void
    {
        if (function_exists($functionName)) {
            $functionInfo = FunctionAnalyzer::analyzeFunction($functionName);
            if ($functionInfo) {
                $this->library['functions'][] = $functionInfo->toArray();
            }
        }
    }

    /**
     * Add a specific class to analyze
     */
    public function addClass(string $className): void
    {
        if (class_exists($className)) {
            $classInfo = ClassAnalyzer::analyzeClass($className);
            if ($classInfo) {
                $this->library['classes'][] = $classInfo->toArray();
            }
        }
    }

    /**
     * Get the complete library as array
     */
    public function getLibrary(): array
    {
        return $this->library;
    }

    /**
     * Export library as JSON
     */
    public function toJson(int $flags = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES): string
    {
        return json_encode($this->library, $flags);
    }

    /**
     * Save library to file
     */
    public function saveToFile(string $filename): bool
    {
        return file_put_contents($filename, $this->toJson()) !== false;
    }
}

/**
 * Function analysis - specialized for function reflection
 */
class FunctionAnalyzer
{
    public static function analyzeFunction(string $functionName): ?FunctionInfo
    {
        try {
            $reflection = new ReflectionFunction($functionName);
            
            return new FunctionInfo(
                name: $reflection->getName(),
                namespace: $reflection->getNamespaceName(),
                file: $reflection->getFileName(),
                line: $reflection->getStartLine(),
                parameters: ParameterAnalyzer::analyzeParameters($reflection->getParameters()),
                returnType: TypeAnalyzer::analyzeType($reflection->getReturnType()),
                isVariadic: $reflection->isVariadic(),
                isGenerator: $reflection->isGenerator(),
                docComment: $reflection->getDocComment() ?: null,
                attributes: ReflectionUtils::getAttributes($reflection)
            );
        } catch (ReflectionException $e) {
            // Log error in production
            return null;
        }
    }
}

/**
 * Parameter analysis - handles function/method parameters
 */
class ParameterAnalyzer
{
    /**
     * @param ReflectionParameter[] $parameters
     * @return ParameterInfo[]
     */
    public static function analyzeParameters(array $parameters): array
    {
        $result = [];
        
        foreach ($parameters as $parameter) {
            $hasDefaultValue = ReflectionUtils::parameterHasDefaultValue($parameter);
            
            $paramInfo = new ParameterInfo(
                name: $parameter->getName(),
                position: $parameter->getPosition(),
                type: TypeAnalyzer::analyzeType($parameter->getType()),
                isOptional: $parameter->isOptional(),
                isVariadic: $parameter->isVariadic(),
                isPassedByReference: $parameter->isPassedByReference(),
                hasDefaultValue: $hasDefaultValue,
                defaultValue: $hasDefaultValue ? ReflectionUtils::getParameterDefaultValue($parameter) : null,
                allowsNull: $parameter->allowsNull(),
                attributes: ReflectionUtils::getAttributes($parameter)
            );
            
            $result[] = $paramInfo;
        }
        
        return $result;
    }
}

/**
 * Class analysis - handles class reflection
 */
class ClassAnalyzer
{
    public static function analyzeClass(string $className): ?ClassInfo
    {
        try {
            $reflection = new ReflectionClass($className);
            
            $classInfo = new ClassInfo();
            $classInfo->name = $reflection->getName();
            $classInfo->shortName = $reflection->getShortName();
            $classInfo->namespace = $reflection->getNamespaceName();
            $classInfo->file = $reflection->getFileName();
            $classInfo->line = $reflection->getStartLine();
            $classInfo->isAbstract = $reflection->isAbstract();
            $classInfo->isFinal = $reflection->isFinal();
            $classInfo->isInterface = $reflection->isInterface();
            $classInfo->isTrait = $reflection->isTrait();
            $classInfo->isEnum = method_exists($reflection, 'isEnum') ? $reflection->isEnum() : false;
            $classInfo->parentClass = $reflection->getParentClass() ? $reflection->getParentClass()->getName() : null;
            $classInfo->interfaces = array_keys($reflection->getInterfaces());
            $classInfo->traits = array_keys($reflection->getTraits());
            $classInfo->constants = self::analyzeConstants($reflection);
            $classInfo->properties = self::analyzeProperties($reflection);
            $classInfo->methods = self::analyzeMethods($reflection);
            $classInfo->docComment = $reflection->getDocComment() ?: null;
            $classInfo->attributes = ReflectionUtils::getAttributes($reflection);
            
            return $classInfo;
        } catch (ReflectionException $e) {
            return null;
        }
    }

    /**
     * @return ConstantInfo[]
     */
    private static function analyzeConstants(ReflectionClass $reflection): array
    {
        $constants = [];
        
        foreach ($reflection->getReflectionConstants() as $constant) {
            $constInfo = new ConstantInfo();
            $constInfo->name = $constant->getName();
            $constInfo->value = $constant->getValue();
            $constInfo->visibility = ReflectionUtils::getVisibility($constant);
            $constInfo->isFinal = method_exists($constant, 'isFinal') ? $constant->isFinal() : false;
            $constInfo->declaringClass = $constant->getDeclaringClass()->getName();
            $constInfo->docComment = $constant->getDocComment() ?: null;
            $constInfo->attributes = ReflectionUtils::getAttributes($constant);
            
            $constants[] = $constInfo;
        }
        
        return $constants;
    }

    /**
     * @return PropertyInfo[]
     */
    private static function analyzeProperties(ReflectionClass $reflection): array
    {
        $properties = [];
        
        foreach ($reflection->getProperties() as $property) {
            $hasDefaultValue = ReflectionUtils::propertyHasDefaultValue($property);
            
            $propInfo = new PropertyInfo();
            $propInfo->name = $property->getName();
            $propInfo->visibility = ReflectionUtils::getVisibility($property);
            $propInfo->isStatic = $property->isStatic();
            $propInfo->isReadonly = method_exists($property, 'isReadOnly') ? $property->isReadOnly() : false;
            $propInfo->hasDefaultValue = $hasDefaultValue;
            $propInfo->defaultValue = $hasDefaultValue ? ReflectionUtils::getPropertyDefaultValue($property) : null;
            $propInfo->type = TypeAnalyzer::analyzeType($property->getType());
            $propInfo->declaringClass = $property->getDeclaringClass()->getName();
            $propInfo->docComment = $property->getDocComment() ?: null;
            $propInfo->attributes = ReflectionUtils::getAttributes($property);
            
            $properties[] = $propInfo;
        }
        
        return $properties;
    }

    /**
     * @return MethodInfo[]
     */
    private static function analyzeMethods(ReflectionClass $reflection): array
    {
        $methods = [];
        
        foreach ($reflection->getMethods() as $method) {
            $methodInfo = new MethodInfo(
                name: $method->getName(),
                namespace: $method->getNamespaceName(),
                file: $method->getFileName(),
                line: $method->getStartLine(),
                parameters: ParameterAnalyzer::analyzeParameters($method->getParameters()),
                returnType: TypeAnalyzer::analyzeType($method->getReturnType()),
                isVariadic: $method->isVariadic(),
                isGenerator: $method->isGenerator(),
                docComment: $method->getDocComment() ?: null,
                attributes: ReflectionUtils::getAttributes($method)
            );
            
            $methodInfo->visibility = ReflectionUtils::getVisibility($method);
            $methodInfo->isStatic = $method->isStatic();
            $methodInfo->isAbstract = $method->isAbstract();
            $methodInfo->isFinal = $method->isFinal();
            $methodInfo->isConstructor = $method->isConstructor();
            $methodInfo->isDestructor = $method->isDestructor();
            $methodInfo->declaringClass = $method->getDeclaringClass()->getName();
            
            $methods[] = $methodInfo;
        }
        
        return $methods;
    }
}

// =============================================================================
// EXAMPLE USAGE AND TEST CODE
// =============================================================================

/**
 * Example functions for testing the analyzer
 */
function exampleFunction(string $name, int $age = 25, ?array $options = null): string
{
    return "Hello, $name (age: $age)";
}

function calculateSum(float ...$numbers): float
{
    return array_sum($numbers);
}

function processData(array|string $input, bool $strict = true): array
{
    return is_array($input) ? $input : [$input];
}

/**
 * Example class for testing the analyzer
 */
class ExampleClass
{
    public const VERSION = '1.0.0';
    private const SECRET = 'hidden';

    public string $name;
    private int $id;
    protected static ?array $cache = null;

    /**
     * Constructor for ExampleClass
     */
    public function __construct(string $name, int $id)
    {
        $this->name = $name;
        $this->id = $id;
    }

    /**
     * Get the name property
     */
    public function getName(): string
    {
        return $this->name;
    }

    /**
     * Clear the static cache
     */
    public static function clearCache(): void
    {
        self::$cache = null;
    }

    /**
     * Get the private ID
     */
    private function getId(): int
    {
        return $this->id;
    }

    /**
     * Process items with type union
     */
    public function processItems(array|object $items): int
    {
        return is_array($items) ? count($items) : 1;
    }
}

/**
 * Example interface
 */
interface ExampleInterface
{
    public function process(): void;
    public function getData(): array;
}

/**
 * Example abstract class
 */
abstract class AbstractProcessor implements ExampleInterface
{
    protected string $type = 'default';
    
    abstract public function execute(): bool;
    
    public function getType(): string
    {
        return $this->type;
    }
}

/**
 * Demonstration and usage
 */
function demonstrateLibraryAnalyzer(): void
{
    echo "=== PHP Library Analyzer Demonstration ===\n\n";
    
    // Create analyzer instance
    $analyzer = new LibraryAnalyzer();
    
    // Analyze all user-defined functions and classes
    echo "Analyzing functions...\n";
    $analyzer->analyzeFunctions();
    
    echo "Analyzing classes...\n";
    $analyzer->analyzeClasses();
    
    // Get the library data
    $library = $analyzer->getLibrary();
    
    // Display summary
    echo "\n=== Analysis Summary ===\n";
    echo "PHP Version: " . $library['php_version'] . "\n";
    echo "Generated at: " . $library['generated_at'] . "\n";
    echo "Functions found: " . count($library['functions']) . "\n";
    echo "Classes found: " . count($library['classes']) . "\n\n";
    
    // Show some example data
    if (!empty($library['functions'])) {
        echo "=== Sample Function Analysis ===\n";
        $firstFunction = $library['functions'][0];
        echo "Function: " . $firstFunction['name'] . "\n";
        echo "Parameters: " . count($firstFunction['parameters']) . "\n";
        echo "Return Type: " . ($firstFunction['return_type']['name'] ?? 'mixed') . "\n\n";
    }
    
    if (!empty($library['classes'])) {
        echo "=== Sample Class Analysis ===\n";
        $firstClass = $library['classes'][0];
        echo "Class: " . $firstClass['name'] . "\n";
        echo "Methods: " . count($firstClass['methods']) . "\n";
        echo "Properties: " . count($firstClass['properties']) . "\n";
        echo "Constants: " . count($firstClass['constants']) . "\n\n";
    }
    
    // Save to file
    $filename = 'library-analysis-' . date('Y-m-d-H-i-s') . '.json';
    if ($analyzer->saveToFile($filename)) {
        echo "Full analysis saved to: $filename\n";
    }
    
    echo "\n=== JSON Preview (first 500 chars) ===\n";
    echo substr($analyzer->toJson(), 0, 500) . "...\n";
}

// Run the demonstration
demonstrateLibraryAnalyzer();
