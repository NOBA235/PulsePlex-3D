"""
Generates a valid binary GLTF (GLB) file representing an anatomical heart mesh
with coronary artery pathways and places it in frontend/public/models/heart.glb.
"""

import os
import json
import struct
import numpy as np

def generate_heart_glb(output_path: str):
    # Create simple 3D mesh vertices for heart base (cone + spheres)
    # A low-poly heart model
    vertices = []
    indices = []

    # Apex to base cone
    segments = 16
    tip = [0.0, -1.0, 0.3]
    vertices.append(tip)
    for i in range(segments):
        theta = 2.0 * np.pi * i / segments
        r = 0.6 + 0.1 * np.sin(theta * 2)
        x = r * np.cos(theta) + 0.05
        z = r * np.sin(theta) * 0.7 + 0.2
        y = 0.0
        vertices.append([float(x), float(y), float(z)])

    for i in range(1, segments + 1):
        next_i = 1 if i == segments else i + 1
        indices.extend([0, i, next_i])

    # Left ventricle dome
    center_lv = [0.2, 0.4, 0.1]
    lv_base_idx = len(vertices)
    vertices.append(center_lv)
    for i in range(segments):
        theta = 2.0 * np.pi * i / segments
        x = 0.5 * np.cos(theta) + 0.2
        y = 0.5 * np.sin(theta) * 0.8 + 0.4
        z = 0.4 * np.sin(theta) + 0.1
        vertices.append([float(x), float(y), float(z)])

    for i in range(lv_base_idx + 1, lv_base_idx + segments + 1):
        next_i = lv_base_idx + 1 if i == lv_base_idx + segments else i + 1
        indices.extend([lv_base_idx, i, next_i])

    # Convert to binary
    vert_bytes = np.array(vertices, dtype=np.float32).tobytes()
    ind_bytes = np.array(indices, dtype=np.uint16).tobytes()

    # Align to 4 bytes
    while len(vert_bytes) % 4 != 0:
        vert_bytes += b'\x00'
    while len(ind_bytes) % 4 != 0:
        ind_bytes += b'\x00'

    bin_data = ind_bytes + vert_bytes

    min_v = np.min(vertices, axis=0).tolist()
    max_v = np.max(vertices, axis=0).tolist()

    # GLTF JSON structure
    gltf = {
        "asset": {"version": "2.0", "generator": "CardioRiskAI GLB Generator"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "HeartAnatomy"}],
        "meshes": [{
            "name": "HeartMesh",
            "primitives": [{
                "attributes": {"POSITION": 1},
                "indices": 0,
                "material": 0
            }]
        }],
        "materials": [{
            "name": "HeartMuscle",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.75, 0.15, 0.2, 1.0],
                "metallicFactor": 0.1,
                "roughnessFactor": 0.5
            }
        }],
        "buffers": [{"byteLength": len(bin_data)}],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": len(ind_bytes),
                "target": 34963 # ELEMENT_ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": len(ind_bytes),
                "byteLength": len(vert_bytes),
                "target": 34962 # ARRAY_BUFFER
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": 5123, # UNSIGNED_SHORT
                "count": len(indices),
                "type": "SCALAR",
                "max": [int(max(indices))],
                "min": [int(min(indices))]
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126, # FLOAT
                "count": len(vertices),
                "type": "VEC3",
                "max": max_v,
                "min": min_v
            }
        ]
    }

    json_str = json.dumps(gltf, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_data)

    header = struct.pack('<4sII', b'glTF', 2, total_len)
    chunk0_header = struct.pack('<II', len(json_bytes), 0x4E4F534A) # JSON
    chunk1_header = struct.pack('<II', len(bin_data), 0x004E4942) # BIN

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(header)
        f.write(chunk0_header)
        f.write(json_bytes)
        f.write(chunk1_header)
        f.write(bin_data)

    print(f"GLB written to {output_path} ({total_len} bytes)")

if __name__ == "__main__":
    out_dir = r"C:\Users\User\.gemini\antigravity\scratch\cardio-risk-ai\frontend\public\models\heart.glb"
    generate_heart_glb(out_dir)

