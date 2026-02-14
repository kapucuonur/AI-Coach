
import React, { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1M...'

const Cesium3DMap = ({ coordinates, currentPosition }) => {
    const containerRef = useRef(null)
    const viewerRef = useRef(null)
    const entityRef = useRef(null)

    useEffect(() => {
        if (!containerRef.current || !coordinates?.length) return

        const viewer = new Cesium.Viewer(containerRef.current, {
            terrainProvider: Cesium.createWorldTerrain(),
            imageryProvider: new Cesium.OpenStreetMapImageryProvider({
                url: 'https://tile.openstreetmap.org/'
            }),
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false
        })

        const positions = coordinates.map(c =>
            Cesium.Cartesian3.fromDegrees(c.lng, c.lat, c.elevation || 0)
        )

        viewer.entities.add({
            polyline: {
                positions: positions,
                width: 4,
                material: Cesium.Color.YELLOW
            }
        })

        if (coordinates[0]) {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                    coordinates[0].lng, coordinates[0].lat, 1000
                ),
                orientation: {
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-45)
                }
            })
        }

        viewerRef.current = viewer

        return () => viewer.destroy()
    }, [coordinates])

    useEffect(() => {
        if (!viewerRef.current || !currentPosition) return

        if (entityRef.current) {
            viewerRef.current.entities.remove(entityRef.current)
        }

        entityRef.current = viewerRef.current.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
                currentPosition.lng,
                currentPosition.lat,
                currentPosition.elevation || 0
            ),
            point: {
                pixelSize: 15,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2
            }
        })

        viewerRef.current.camera.lookAt(
            Cesium.Cartesian3.fromDegrees(
                currentPosition.lng,
                currentPosition.lat,
                currentPosition.elevation || 0
            ),
            new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(0),
                Cesium.Math.toRadians(-30),
                500
            )
        )
    }, [currentPosition])

    return <div ref={containerRef} className="w-full h-96 rounded-lg overflow-hidden" />
}

export default Cesium3DMap
